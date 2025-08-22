const axios = require('axios');

async function trackColissimo(parcelNumber) {
  const url = 'https://ws.colissimo.fr/tracking-timeline-ws/rest/tracking/timelineCompany';
  const data = {
    login: '833299',
    password: 'julien75',
    parcelNumber: parcelNumber,
    lang: 'fr_FR'
  };

  try {
    const response = await axios.post(url, data);
    return response.data.events || [];
  } catch (error) {
    throw new Error(
      error.response ? JSON.stringify(error.response.data) : error.message
    );
  }
}

module.exports = { 
  trackColissimo
};