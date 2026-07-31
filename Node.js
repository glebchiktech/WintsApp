const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(express.static('public'));
app.use(express.json());

// Инициализируем клиент WhatsApp с сохранением сессии
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox'] }
});

let isReady = false;
let currentQr = '';

client.on('qr', (qr) => {
    // Генерируем QR-код в формате картинки Base64
    qrcode.toDataURL(qr, (err, url) => {
        currentQr = url;
    });
    isReady = false;
    console.log('[WA] Нужна авторизация! Отсканируйте QR-код.');
});

client.on('ready', () => {
    isReady = true;
    currentQr = '';
    console.log('[WA] Сервер успешно подключен к WhatsApp!');
});

client.initialize();

// API 1: Проверка статуса (авторизован или нужен QR)
app.get('/api/status', (req, res) => {
    res.json({ isReady, qr: currentQr });
});

// API 2: Фоновая отправка сообщения
app.post('/api/send-direct', async (req, res) => {
    if (!isReady) {
        return res.status(400).json({ success: false, error: 'Сервер ещё не подключен к WhatsApp! Отсканируйте QR-код.' });
    }

    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Заполните номер и текст сообщения!' });
    }

    // Приводим номер к международному формату WhatsApp (1234567890@c.us)
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('8')) {
        cleanPhone = '7' + cleanPhone.slice(1);
    }
    const chatId = `${cleanPhone}@c.us`;

    try {
        // Сервер сам отправляет сообщение в сеть WhatsApp
        await client.sendMessage(chatId, message);
        console.log(`[УСПЕХ] Сообщение отправлено на +${cleanPhone}`);
        
        // Отправляем сайту ответ "Успешно отправлено"
        res.json({ success: true, message: 'Сообщение успешно доставлено!' });
    } catch (err) {
        console.error('[ОШИБКА ОTПРАВКИ]', err);
        res.json({ success: false, error: 'Не удалось отправить сообщение. Проверьте номер.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});
