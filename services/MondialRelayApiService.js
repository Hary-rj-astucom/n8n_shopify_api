require('dotenv').config();
const axios = require('axios');

// URL de l'API Mondial Relay
const url = 'https://connect-api.mondialrelay.com/api/tracking';

async function trackShipment(shipin_number = 96408887) {
  try {
    const xmlData = `<?xml version="1.0" encoding="utf-8"?> <TrackingRequest xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="http://www.example.org/Request"> <Context> <Login>${process.env.MONDIAL_RELAY_LOGIN_API}</Login> <Password>${process.env.MONDIAL_RELAY_SECRET_KEY_API}</Password> <CustomerId>${process.env.MONDIAL_RELAY_BRAND_ID}</CustomerId> <Culture>fr-FR</Culture> <VersionAPI>1.0</VersionAPI> </Context> <TrackingList> <ShipmentNumber>${shipin_number}</ShipmentNumber> </TrackingList> </TrackingRequest>`;

    const response = await axios.post(url, xmlData, {
      headers: {
        'Accept': 'application/xml',
        'Content-Type': 'text/xml',
      },
    });

    console.log('Réponse du serveur :');
    console.log(response.data);

  } catch (error) {
    console.error('Erreur lors de la requête :', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Body:', error.response.data);
    }
  }
}

module.exports = { 
  trackShipment
};