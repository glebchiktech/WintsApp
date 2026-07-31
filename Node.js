const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const pino = require('pino');

const app = express();
app.use(express.json());
app.use(express.static('public'));

let sock = null;
let isConnected = false;

async function connectToWhatsApp() {
    // Сохранение сессии в папку auth_info_baileys
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Генерируем сами через qrcode-terminal
        logger: pino({ level: 'silent' }), // Отключаем лишний мусор в логах
        browser: ['Wintsapp Server', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n==================================================');
            console.log('ОТСКАНИРУЙТЕ QR-КОД В WHATSAPP (Связаные устройства):');
            console.log('==================================================\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            isConnected = false;
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log('[ОТКЛЮЧЕНО] Соединение разорвано. Переподключение:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            isConnected = true;
            console.log('\n==================================================');
            console.log('[УСПЕХ] Сервер успешно подключен к WhatsApp!');
            console.log('==================================================\n');
        }
    });
}

// API проверки статуса
app.get('/api/status', (req, res) => {
    res.json({ isConnected });
});

// API отправки сообщения из формы HTML
app.post('/api/send', async (req, res) => {
    if (!isConnected || !sock) {
        return res.status(400).json({ success: false, error: 'Сервер ещё не подключен к WhatsApp! Отсканируйте QR-код в терминале.' });
    }

    const { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Укажите номер и текст сообщения' });
    }

    try {
        // Форматирование номера (преобразуем 8... в 7..., убираем лишнее)
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 11 && cleanPhone.startsWith('8')) {
            cleanPhone = '7' + cleanPhone.slice(1);
        }

        const jid = `${cleanPhone}@s.whatsapp.net`;

        // Отправка через Baileys
        await sock.sendMessage(jid, { text: message });

        console.log(`[ОТПРАВЛЕНО] Сообщение для +${cleanPhone}: "${message}"`);
        res.json({ success: true });
    } catch (err) {
        console.error('[ОШИБКА ОТПРАВКИ]:', err);
        res.status(500).json({ success: false, error: 'Ошибка при отправке сообщения' });
    }
});

app.listen(3000, () => {
    console.log('Сервер запущен! Откройте http://localhost:3000 в браузере');
    connectToWhatsApp();
});
