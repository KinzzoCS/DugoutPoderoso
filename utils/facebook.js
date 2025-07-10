// facebook.js
require('dotenv').config();
const fetch = require('node-fetch');

const FACEBOOK_POST_ID = process.env.FACEBOOK_POST_ID; // lo defines en el .env
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const BACKEND_ENDPOINT = process.env.BACKEND_ENDPOINT || 'http://localhost:3000/mensajes';

const POLLING_INTERVAL_MS = 30 * 1000; // cada 30 segundos
const comentariosVistos = new Set();

async function obtenerComentarios() {
  const url = `https://graph.facebook.com/v17.0/${FACEBOOK_POST_ID}/comments?access_token=${FACEBOOK_ACCESS_TOKEN}&order=chronological&limit=100`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.data) {
      console.error('❌ Error al obtener comentarios:', data.error || data);
      return;
    }

    const nuevosComentarios = data.data.filter(c => !comentariosVistos.has(c.id));

    for (const comentario of nuevosComentarios) {
      comentariosVistos.add(comentario.id);

      const mensaje = {
        id: comentario.id,
        usuario: comentario.from?.name || 'Desconocido',
        mensaje: comentario.message || '',
        fecha: comentario.created_time,
        origen: 'facebook'
      };

      enviarMensaje(mensaje);
    }

    if (nuevosComentarios.length > 0) {
      console.log(`📨 ${nuevosComentarios.length} comentarios nuevos enviados`);
    }
  } catch (err) {
    console.error('❌ Error de red o fetch:', err);
  }
}

async function enviarMensaje(mensaje) {
  try {
    const res = await fetch(BACKEND_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mensaje)
    });

    if (!res.ok) {
      console.error('❌ Error al enviar a backend:', await res.text());
    }
  } catch (err) {
    console.error('❌ Error al enviar al backend:', err);
  }
}

console.log('🚀 Escuchando comentarios de Facebook...');
setInterval(obtenerComentarios, POLLING_INTERVAL_MS);
