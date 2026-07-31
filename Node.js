const express = require('express');
const app = express();

app.use(express.static('public'));
app.use(express.json());

// API для обработки номера и создания ссылок
app.post('/api/send', (req, res) => {
    const { phone, message } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, error: 'Введите номер телефона' });
    }

    // Очищаем номер от плюсов, скобок и пробелов
    let cleanPhone = phone.replace(/\D/g, '');

    // Если номер начинается с 8 (для Казахстана/России), меняем на 7
    if (cleanPhone.length === 11 && cleanPhone.startsWith('8')) {
        cleanPhone = '7' + cleanPhone.slice(1);
    }

    // Закодируем текст сообщения для URL (чтобы пробелы и спецсимволы не ломали ссылку)
    const encodedMessage = encodeURIComponent(message || '');

    // 1. Прямая универсальная ссылка (работает везде: телефон, ПК, планшет)
    const waDirectUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    // 2. Ссылка конкретно для веб-версии WhatsApp Web на ПК
    const waWebUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;

    console.log(`[ССЫЛКА СГЕНЕРИРОВАНА] Номер: ${cleanPhone}`);

    res.json({
        success: true,
        phone: cleanPhone,
        waDirectUrl,
        waWebUrl
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
