require('dotenv').config();
const express = require('express');
const path = require('path');
const {
  extractVideoId,
  getLiveChatId,
  getLiveChatMessages
} = require('./utils/youtube');

const app = express();
const PORT = process.env.PORT || 3000;

let liveChatId = null;
let nextPageToken = '';
let mensajes = [];

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Evita duplicados y limita a 300 mensajes
function mergeMessages(oldMessages, newMessages) {
  const ids = new Set(oldMessages.map(m => m.id));
  const merged = [...oldMessages];

  newMessages.forEach(m => {
    if (!ids.has(m.id)) {
      merged.push(m);
    }
  });

  if (merged.length > 300) {
    return merged.slice(-300);
  }

  return merged;
}

// Iniciar el chat con una URL desde frontend
app.post('/api/iniciar', async (req, res) => {
  const { url } = req.body;
  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: 'No se pudo extraer el ID del video.' });

  const chatId = await getLiveChatId(videoId);
  if (!chatId) return res.status(404).json({ error: 'No se encontró chat en vivo.' });

  liveChatId = chatId;
  nextPageToken = '';
  mensajes = [];

  res.json({ message: 'Chat iniciado correctamente.' });
});

// Obtener mensajes crudos cada vez que el frontend lo pida (1 vez por minuto)
app.get('/api/mensajes', async (req, res) => {
  if (!liveChatId) return res.status(400).json({ error: 'Chat no iniciado' });

  try {
    const data = await getLiveChatMessages(liveChatId, nextPageToken);
    if (!data) return res.status(500).json({ error: 'Error al obtener mensajes' });

    nextPageToken = data.nextPageToken;
    mensajes = mergeMessages(mensajes, data.messages);

    res.json({ mensajes });
  } catch (err) {
    console.error('❌ Error en /api/mensajes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 Servidor corriendo en http://localhost:${PORT}`);
});
