const express = require('express');
const cors = require('cors');
const os = require('os');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 ВСТАВЬ СВОИ ДАННЫЕ С MY.TELEGRAM.ORG
const apiId = 1234567; // Замени на свой числовой API ID
const apiHash = "ВАШ_API_HASH_СЮДА"; // Замени на свой API Hash строку

const stringSession = new StringSession(""); 

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

// Автоматически подключаемся к Telegram при старте
(async () => {
  console.log("Подключение к серверам Telegram...");
  await client.connect();
  console.log("Успешно подключено к Telegram API!");
})();

// Ручка 1: Отправка кода на телефон
app.post('/api/send-code', async (req, res) => {
  const { phone } = req.body;
  console.log(`Запрос кода для номера: ${phone}`);

  try {
    const result = await client.sendCode(
      { apiId, apiHash },
      phone
    );
    console.log("Код успешно отправлен!");
    res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
  } catch (error) {
    console.error("Ошибка при отправке кода:", error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Ручка 2: Вход по коду
app.post('/api/login', async (req, res) => {
  const { phone, code, phoneCodeHash } = req.body;
  console.log(`Проверка кода ${code} для ${phone}...`);

  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash: phoneCodeHash,
        phoneCode: code,
      })
    );
    console.log("Авторизация прошла успешно!");
    res.json({ success: true });
  } catch (error) {
    console.error("Ошибка авторизации:", error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Авто-определение IP-адреса компьютера в локальной сети
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = 3000;
const localIp = getLocalIp();

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n==================================================');
  console.log(`🚀 Сервер запущен!`);
  console.log(`- Локально на ПК: http://localhost:${PORT}`);
  console.log(`- Со смартфона в Wi-Fi сети: http://${localIp}:${PORT}`);
  console.log('==================================================\n');
});
