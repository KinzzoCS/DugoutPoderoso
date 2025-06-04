require('dotenv').config(); // Carga variables de entorno

const express = require('express');
const path = require('path');
const {
  extractVideoId,
  getLiveChatId,
  getLiveChatMessages
} = require('./utils/youtube');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

let messages = [];
let nextPageToken = '';
let fetching = false;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.post('/start', async (req, res) => {
  const url = req.body.url;
  const videoId = extractVideoId(url);

  if (!videoId) return res.send("❌ No se pudo extraer el ID del video.");

  const liveChatId = await getLiveChatId(videoId);
  if (!liveChatId) return res.send("❌ No se encontró chat en vivo.");

  messages = [];
  nextPageToken = '';
  fetching = true;

  const fetchMessages = async () => {
    if (!fetching) return;

    const data = await getLiveChatMessages(liveChatId, nextPageToken);
    if (data) {
      data.messages.forEach(msg => {
        messages.push(`[${msg.publishedAt}] ${msg.author}: ${msg.message}`);
      });
      nextPageToken = data.nextPageToken;
    } else {
      fetching = false;
    }
  };

  await fetchMessages(); // Primera tanda
  setInterval(fetchMessages, 20000); // Luego cada 20s

  res.redirect('/chat.html');
});

app.get('/messages', (req, res) => {
  res.json({ messages });
});

app.listen(port, () => {
  console.log(`🌍 Servidor en http://localhost:${port}`);
});
