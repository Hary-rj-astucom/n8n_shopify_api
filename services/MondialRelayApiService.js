const axios = require('axios');

const CLIENT_ID = process.env.MONDIAL_RELAY_BRAND_ID;
const CLIENT_SECRET = process.env.MONDIAL_RELAY_SECRET_KEY_API;
const BASE_URL = process.env.MONDIAL_RELAY_URL;

async function getAccessToken() {
    try {
        const response = await axios.post(`${BASE_URL}/oauth/token`, {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'client_credentials'
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Erreur lors de la récupération du token:", error.response?.data || error.message);
        throw error;
    }
}

async function getShipmentStatus(trackingNumber) {
    try {
        const token = await getAccessToken();
        const response = await axios.get(`${BASE_URL}/api/Shipment/${trackingNumber}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
            }
        });
        console.log(response.data);
    } catch (error) {
        console.error("Erreur lors de la récupération du statut:", error.response?.data || error.message);
    }
}

module.exports = { 
  getShipmentStatus
};