const express = require('express');
const app = express();

app.use(express.static('public'));
app.use(express.json());

// Простая база данных активных пользователей (в памяти сервера)
const activeUsers = new Map();

// 1. Авторизация / Вход по своему номеру
app.post('/api/login', (req, res) => {
    const { myPhone } = req.body;

    if (!myPhone) {
        return res.status(400).json({ success: false, error: 'Введите ваш номер' });
    }

    let cleanPhone = myPhone.replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('8')) {
        cleanPhone = '7' + cleanPhone.slice(1);
    }

    // Запоминаем пользователя в базе
    activeUsers.set(cleanPhone, {
        loginTime: new Date(),
        status: 'active'
    });

    console.log(`[БАЗА] Пользователь авторизован: +${cleanPhone}`);

    res.json({
        success: true,
        user: {
            phone: cleanPhone
        }
    });
});

// 2. Отправка сообщения получателю
app.post('/api/send-message', (req, res) => {
    const { senderPhone, recipientPhone, message } = req.body;

    let cleanSender = senderPhone ? senderPhone.replace(/\D/g, '') : '';
    let cleanRecipient = recipientPhone ? recipientPhone.replace(/\D/g, '') : '';

    if (cleanSender.length === 11 && cleanSender.startsWith('8')) cleanSender = '7' + cleanSender.slice(1);
    if (cleanRecipient.length === 11 && cleanRecipient.startsWith('8')) cleanRecipient = '7' + cleanRecipient.slice(1);

    // Проверяем, есть ли отправитель в нашей базе
    if (!activeUsers.has(cleanSender)) {
        return res.status(403).json({ success: false, error: 'Сессия не найдена. Войдите снова.' });
    }

    if (!cleanRecipient) {
        return res.status(400).json({ success: false, error: 'Укажите номер получателя' });
    }

    const encodedMsg = encodeURIComponent(message || '');
    
    // Формируем прямую ссылку пересылки
    const waUrl = `https://wa.me/${cleanRecipient}?text=${encodedMsg}`;

    console.log(`[ОТПРАВКА] От: +${cleanSender} -> Кому: +${cleanRecipient}`);

    res.json({
        success: true,
        recipient: cleanRecipient,
        waUrl: waUrl
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});
