// server.js
const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { RSA } = require('telegram/crypto/RSA');

const app = express();
app.use(cors());
app.use(express.json());

// Твои учетные данные Telegram API
const apiId = 30694571;
const apiHash = "73d409218e3d86dae379240c2fbf3c91";

// Публичные RSA-ключи Telegram, которые ты передал
const PUBLIC_KEYS = [
  `-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAyMEdY1aR+sCR3ZSJrtztKTKqigvO/vBfqACJLZtS7QMgCGXJ6XIR\nyy7mx66W0/sOFa7/1mAZtEoIokDP3ShoqF4fVNb6XeqgQfaUHd8wJpDWHcR2OFwv\nplUUI1PLTktZ9uW2WE23b+ixNwJjJGwBDJPQEQFBE+vfmH0JP503wr5INS1poWg/\nj25sIWeYPHYeOrFp/eXaqhISP6G+q2IeTaWTXpwZj4LzXq5YOpk4bYEQ6mvRq7D1\naHWfYmlEGepfaYR8Q0YqvvhYtMte3ITnuSJs171+GDqpdKcSwHnd6FudwGO4pcCO\nj4WcDuXc2CTHgH8gFTNhp/Y8/SpDOhvn9QIDAQAB\n-----END RSA PUBLIC KEY-----`,
  `-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEA6LszBcC1LGzyr992NzE0ieY+BSaOW622Aa9Bd4ZHLl+TuFQ4lo4g\n5nKaMBwK/BIb9xUfg0Q29/2mgIR6Zr9krM7HjuIcCzFvDtr+L0GQjae9H0pRB2OO\n62cECs5HKhT5DZ98K33vmWiLowc621dQuwKWSQKjWf50XYFw42h21P2KXUGyp2y/\n+aEyZ+uVgLLQbRA1dEjSDZ2iGRy12Mk5gpYc397aYp438fsJoHIgJ2lgMv5h7WY9\nt6N/byY9Nw9p21Og3AoXSL2q/2IJ1WRUhebgAdGVMlV1fkuOQoEzR7EdpqtQD9Cs\n5+bfo3Nhmcyvk5ftB0WkJ9z6bNZ7yxrP8wIDAQAB\n-----END RSA PUBLIC KEY-----`
];

let stringSession = new StringSession("");
let client = null;
let currentPhone = "";
let phoneCodeHash = "";

// Инициализация подключения к сессии Telegram
async function initClient() {
  client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
    serverAddress: "149.154.167.50", // Production IP
    serverPort: 443
  });
  await client.connect();
}
initClient();

// 1. Отправка SMS / Telegram-кода на телефон
app.post('/api/send-code', async (req, res) => {
  try {
    const { phone } = req.body;
    currentPhone = phone;

    const result = await client.sendCode(
      { apiId, apiHash },
      phone
    );

    phoneCodeHash = result.phoneCodeHash;
    res.json({ success: true, phoneCodeHash });
  } catch (error) {
    console.error("Ошибка отправки кода:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Ввод кода и авторизация
app.post('/api/login', async (req, res) => {
  try {
    const { code, password } = req.body;

    await client.signIn({
      phoneNumber: currentPhone,
      phoneCodeHash: phoneCodeHash,
      phoneCode: code,
      password: password || undefined
    });

    const sessionString = client.session.save();
    res.json({ success: true, session: sessionString });
  } catch (error) {
    console.error("Ошибка авторизации:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Получение списка диалогов
app.get('/api/chats', async (req, res) => {
  try {
    const dialogs = await client.getDialogs({ limit: 20 });
    const chats = dialogs.map(d => ({
      id: d.id.toString(),
      name: d.title || d.name || "Чат",
      message: d.message ? d.message.text : "",
      unread: d.unreadCount
    }));
    res.json({ success: true, chats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Получение сообщений конкретного чата
app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const messages = await client.getMessages(req.params.chatId, { limit: 30 });
    const formatted = messages.map(m => ({
      id: m.id,
      text: m.message,
      out: m.out, // true = отправлено мной, false = входящее
      date: m.date
    })).reverse();
    res.json({ success: true, messages: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Отправка сообщения человеку
app.post('/api/send-message', async (req, res) => {
  try {
    const { chatId, message } = req.body;
    await client.sendMessage(chatId, { message });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(3000, () => {
  console.log(' Telegram Backend запущен на http://localhost:3000');
});
