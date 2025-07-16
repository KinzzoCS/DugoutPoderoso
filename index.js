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

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

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

    nextPageToken = data.nextPageToken;
    console.log("📨 [API] Mensajes recibidos:", data.messages.length);

    // ✅ Enviar directamente los nuevos mensajes (sin acumulación)
    res.json({ mensajes: data.messages });

  } catch (err) {
    console.error("❌ [API] Error interno en /api/mensajes:", err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 Servidor corriendo en http://localhost:${PORT}`);
});

const comentariosCronistas = [];

app.post('/api/cronistas', (req, res) => {
  const comentario = req.body;

  if (!comentario || !comentario.texto) {
    return res.status(400).json({ error: 'Comentario inválido' });
  }

  comentariosCronistas.push({
    texto: comentario.texto,
    autor: comentario.autor || 'Anónimo',
    foto: comentario.foto || '',
    timestamp: Date.now()
  });

  console.log('[Guardado] Comentario para cronistas:', comentario.texto);
  res.status(201).json({ ok: true });
});

app.get('/api/cronistas', (req, res) => {
  res.json(comentariosCronistas);
});

app.delete('/api/cronistas/:timestamp', (req, res) => {
  const ts = parseInt(req.params.timestamp);
  if (!ts) return res.status(400).json({ error: 'Timestamp inválido' });

  const index = comentariosCronistas.findIndex(c => c.timestamp === ts);
  if (index === -1) return res.status(404).json({ error: 'Comentario no encontrado' });

  comentariosCronistas.splice(index, 1);
  console.log(`[Eliminado] Comentario con timestamp ${ts}`);
  res.json({ ok: true });
});

