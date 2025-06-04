require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.YOUTUBE_API_KEY;

function extractVideoId(url) {
  const regex = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function getLiveChatId(videoId) {
  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: 'liveStreamingDetails',
        id: videoId,
        key: apiKey
      }
    });

    const details = response.data.items[0]?.liveStreamingDetails;
    return details?.activeLiveChatId || null;
  } catch (error) {
    console.error("Error al obtener el liveChatId:", error.message);
    return null;
  }
}

async function getLiveChatMessages(liveChatId, pageToken = '') {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/liveChat/messages', {
      params: {
        liveChatId,
        part: 'snippet,authorDetails',
        key: apiKey,
        pageToken
      }
    });

    const messages = response.data.items.map(item => ({
      author: item.authorDetails.displayName,
      message: item.snippet.displayMessage,
      publishedAt: item.snippet.publishedAt
    }));

    return {
      messages,
      nextPageToken: response.data.nextPageToken
    };
  } catch (error) {
    console.error("Error al obtener mensajes del chat:", error.message);
    return null;
  }
}

module.exports = {
  extractVideoId,
  getLiveChatId,
  getLiveChatMessages
};
