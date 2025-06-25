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

// 🔁 Evita duplicados al agregar mensajes
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

// 🚀 Ruta para iniciar chat con URL desde frontend
app.post('/api/iniciar', async (req, res) => {
  const { url } = req.body;
  console.log("📥 [API] Recibida URL:", url);

  const videoId = extractVideoId(url);
  console.log("🎯 [API] Video ID extraído:", videoId);

  if (!videoId) {
    console.warn("⚠️ [API] No se pudo extraer el ID del video.");
    return res.status(400).json({ error: 'No se pudo extraer el ID del video.' });
  }

  try {
    const chatId = await getLiveChatId(videoId);
    console.log("💬 [API] Live Chat ID:", chatId);

    if (!chatId) {
      console.warn("⚠️ [API] No se encontró chat en vivo.");
      return res.status(404).json({ error: 'No se encontró chat en vivo.' });
    }

    liveChatId = chatId;
    nextPageToken = '';
    mensajes = [];
    mensajesLeidos = new Set();

    console.log("✅ [API] Chat iniciado correctamente.");
    res.json({ message: 'Chat iniciado correctamente.' });

  } catch (err) {
    console.error("❌ [API] Error en /api/iniciar:", err);
    res.status(500).json({ error: 'Error al iniciar chat' });
  }
});

// 🔄 Ruta para obtener mensajes crudos desde YouTube
app.get('/api/mensajes', async (req, res) => {
  if (!liveChatId) {
    console.warn("⚠️ [API] Chat no iniciado aún.");
    return res.status(400).json({ error: 'Chat no iniciado' });
  }

  try {
    console.log("🔁 [API] Solicitando mensajes del chat:", liveChatId);
    const data = await getLiveChatMessages(liveChatId, nextPageToken);

    if (!data) {
      console.error("❌ [API] No se obtuvo respuesta de la API de YouTube.");
      return res.status(500).json({ error: 'Error al obtener mensajes' });
    }

    console.log("📨 [API] Mensajes recibidos:", data.messages.length);
    nextPageToken = data.nextPageToken;
    mensajes = mergeMessages(mensajes, data.messages);

    res.json({ mensajes });
  } catch (err) {
    console.error("❌ [API] Error interno en /api/mensajes:", err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 Servidor corriendo en http://localhost:${PORT}`);
});
