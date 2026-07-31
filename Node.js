const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

// Инициализация WhatsApp с автоматическим сохранением сессии
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// 1. Генерация QR-кода при первом входе
client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        io.emit('qr', url); // Отправляем QR-код на сайт
    });
    console.log('[WA] Нужна авторизация! Отсканируйте QR-код на сайте.');
});

// 2. Успешное подключение к WhatsApp
client.on('ready', () => {
    console.log('[WA] Сервер успешно подключен к WhatsApp!');
    io.emit('ready', true);
});

// 3. Входящие сообщения (ОТВЕТЫ СОБЕСЕДНИКА)
client.on('message', async (msg) => {
    const contact = await msg.getContact();
    const cleanPhone = msg.from.replace('@c.us', '');

    console.log(`[ВХОДЯЩЕЕ] От +${cleanPhone}: ${msg.body}`);

    // Пересылаем ответ собеседника прямо на наш сайт в реальном времени!
    io.emit('incoming_message', {
        from: cleanPhone,
        senderName: contact.pushname || contact.name || cleanPhone,
        text: msg.body,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
});

client.initialize();

// Socket.io для обработки действий с сайта
io.on('connection', (socket) => {
    // При подключении сайта проверяем, готов ли WhatsApp
    socket.emit('status', { isReady: client.info ? true : false });

    // Отправка сообщения с сайта
    socket.on('send_message', async (data) => {
        const { phone, message } = data;

        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 11 && cleanPhone.startsWith('8')) {
            cleanPhone = '7' + cleanPhone.slice(1);
        }

        const chatId = `${cleanPhone}@c.us`;

        try {
            // Сервер сам отправляет сообщение в WhatsApp (БЕЗ РЕДИРЕКТОВ)
            await client.sendMessage(chatId, message);
            console.log(`[ОТПРАВЛЕНО] На +${cleanPhone}: ${message}`);

            // Подтверждаем сайту успешную отправку
            socket.emit('message_sent', {
                success: true,
                to: cleanPhone,
                text: message,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        } catch (err) {
            console.error('[ОШИБКА ОTПРАВКИ]', err);
            socket.emit('message_sent', { success: false, error: 'Не удалось отправить сообщение' });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`=== Веб-мессенджер запущен: http://localhost:${PORT} ===`);
});
