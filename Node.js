const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Подменяем User-Agent на свежий Google Chrome для Windows 11
app.use('/', createProxyMiddleware({
    target: 'https://web.whatsapp.com',
    changeOrigin: true,
    onProxyReq: (proxyReq) => {
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    }
}));

app.listen(8080, () => console.log('Прокси работает на http://localhost:8080'));
