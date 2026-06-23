const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

app.post('/telegram/send', async (req, res) => {
  if (!TELEGRAM_BOT_TOKEN) return res.status(500).json({ ok: false, error: 'Telegram bot token not set on server (TELEGRAM_BOT_TOKEN).' });
  const { chat_id, text } = req.body || {};
  if (!chat_id || !text) return res.status(400).json({ ok: false, error: 'chat_id and text required' });

  try {
    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text, parse_mode: 'Markdown' }),
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/telegram/getUpdates', async (req, res) => {
  if (!TELEGRAM_BOT_TOKEN) return res.status(500).json({ ok: false, error: 'Telegram bot token not set on server (TELEGRAM_BOT_TOKEN).' });
  try {
    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`Telegram proxy running on http://localhost:${PORT}`));
