const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Отдаем статические файлы из папки public
app.use(express.static('public'));
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Вывод QR-кода в терминал
client.on('qr', (qr) => {
    console.log('\n--- ОТСКАНТИРУЙТЕ QR-КОД В WHATSAPP ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n[УСПЕХ] WhatsApp успешно подключен и готов к работе!');
});

// Обработка входящих сообщений
client.on('message', async (msg) => {
    const chat = await msg.getChat();
    io.emit('new_message', {
        from: chat.name || msg.from,
        body: msg.body,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'incoming'
    });
});

// API-эндпоинт для отправки сообщений
app.post('/api/send', async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Заполните номер и сообщение' });
    }

    try {
        // Очищаем номер от плюсов, пробелов и тире
        let cleanPhone = phone.replace(/\D/g, '');

        // Преобразуем формат номера в chatId для WhatsApp
        const chatId = `${cleanPhone}@c.us`;

        // Отправляем сообщение
        await client.sendMessage(chatId, message);

        console.log(`[ОТПРАВЛЕНО] Кому: ${cleanPhone} | Текст: ${message}`);
        res.json({ success: true });
    } catch (error) {
        console.error('[ОШИБКА ОТПРАВКИ]:', error);
        res.status(500).json({ success: false, error: 'Не удалось отправить сообщение' });
    }
});

server.listen(3000, () => {
    console.log('Сервер запущен! Откройте http://localhost:3000 в браузере');
});

client.initialize();
