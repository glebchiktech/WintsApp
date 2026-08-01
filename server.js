const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// Твои официальные ключи Telegram API:
const apiId = 30694571;
const apiHash = "73d409218e3d86dae379240c2fbf3c91";
const stringSession = new StringSession(""); 

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

// Подключаемся к серверам Telegram при старте
client.connect().then(() => {
  console.log("Успешное подключение к Telegram API!");
});

// 1. Отправка SMS / кода в Telegram
app.post('/api/send-code', async (req, res) => {
  const { phone } = req.body;
  try {
    const result = await client.sendCode(
      { apiId, apiHash },
      phone
    );
    res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
  } catch (error) {
    console.error("Ошибка sendCode:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// 2. Вход по 5-значному коду
app.post('/api/login', async (req, res) => {
  const { phone, code, phoneCodeHash } = req.body;
  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash: phoneCodeHash,
        phoneCode: code,
      })
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Ошибка login:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log('----------------------------------------------------');
  console.log(' Сервер WintsApp запущен на http://localhost:3000');
  console.log('----------------------------------------------------');
});
