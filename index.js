const express = require('express');
const path = require('path');
const {
  extractVideoId,
  getLiveChatId,
  getLiveChatMessages
} = require('./utils/youtube');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Datos en memoria para los mensajes y el estado del checkbox
let mensajes = [];
let mensajesLeidos = new Set();

let liveChatId = '';
let nextPageToken = '';

// Ruta raíz con dos botones
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centro de mensajes con checkbox
app.get('/centro-mensajes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'centro-mensajes.html'));
});

// API para iniciar chat (recibe URL del directo)
app.post('/api/iniciar-chat', async (req, res) => {
  const { url } = req.body;
  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: 'ID de video inválido' });

  liveChatId = await getLiveChatId(videoId);
  if (!liveChatId) return res.status(404).json({ error: 'No se encontró chat en vivo' });

  mensajes = [];
  mensajesLeidos.clear();
  nextPageToken = '';
  res.json({ message: 'Chat iniciado' });
});

// API para obtener mensajes nuevos
app.get('/api/mensajes', async (req, res) => {
  if (!liveChatId) return res.status(400).json({ error: 'Chat no iniciado' });
  const data = await getLiveChatMessages(liveChatId, nextPageToken);
  if (!data) return res.status(500).json({ error: 'Error al obtener mensajes' });

  // Guardamos mensajes y nextPageToken
  nextPageToken = data.nextPageToken;
  // Añadimos solo los nuevos
  mensajes.push(...data.messages);

  res.json({ mensajes, mensajesLeidos: Array.from(mensajesLeidos) });
});

// API para marcar mensaje como leído
app.post('/api/marcar-leido', (req, res) => {
  const { messageId, leido } = req.body;
  if (leido) mensajesLeidos.add(messageId);
  else mensajesLeidos.delete(messageId);

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
