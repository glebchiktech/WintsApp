const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// ⚠️ Вставь сюда свои API_ID и API_HASH с сайта my.telegram.org
const apiId = 1234567; // Замени на свой API ID
const apiHash = "ВАШ_API_HASH_СЮДА"; 
const stringSession = new StringSession(""); 

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

// Подключаемся к Telegram при старте сервера
client.connect();

// Ручка 1: Запрос кода на номер
app.post('/api/send-code', async (req, res) => {
  const { phone } = req.body;
  try {
    const result = await client.sendCode(
      { apiId, apiHash },
      phone
    );
    res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Ручка 2: Вход по коду
app.post('/api/login', async (req, res) => {
  const { phone, code, phoneCodeHash } = req.body;
  try {
    await client.invoke(
      new telegram.Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash: phoneCodeHash,
        phoneCode: code,
      })
    );
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Сервер авторизации Telegram запущен на http://localhost:3000');
});
