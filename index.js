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
let mensajesLeidos = new Set();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Evita duplicados al agregar mensajes
function mergeMessages(oldMessages, newMessages) {
  const ids = new Set(oldMessages.map(m => m.id));
  const merged = [...oldMessages];
  newMessages.forEach(m => {
    if (!ids.has(m.id)) {
      merged.push(m);
    }
  });
  return merged;
}

// Ruta para iniciar chat con URL desde frontend
app.post('/api/iniciar', async (req, res) => {
  const { url } = req.body;
  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: 'No se pudo extraer el ID del video.' });

  const chatId = await getLiveChatId(videoId);
  if (!chatId) return res.status(404).json({ error: 'No se encontró chat en vivo.' });

  liveChatId = chatId;
  nextPageToken = '';
  mensajes = [];
  mensajesLeidos = new Set();

  res.json({ message: 'Chat iniciado correctamente.' });
});

// Obtener mensajes actualizados
app.get('/api/mensajes', async (req, res) => {
  if (!liveChatId) return res.status(400).json({ error: 'Chat no iniciado' });

  const data = await getLiveChatMessages(liveChatId, nextPageToken);
  if (!data) return res.status(500).json({ error: 'Error al obtener mensajes' });

  nextPageToken = data.nextPageToken;

  // 👇 Acumulamos los nuevos sin duplicar
  mensajes = mergeMessages(mensajes, data.messages);

  res.json({ mensajes, mensajesLeidos: Array.from(mensajesLeidos) });
});


// Marcar mensajes como leídos o no
app.post('/api/marcar-leido', (req, res) => {
  const { id, leido } = req.body;
  if (!id) return res.status(400).json({ error: 'Falta id de mensaje' });

  if (leido) mensajesLeidos.add(id);
  else mensajesLeidos.delete(id);

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
