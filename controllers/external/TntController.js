require('dotenv').config();
const TntApiService = require('../../services/TntApiService');

const trackpackage = async (req, res) => {
  try {
    const tnt = new TntApiService(process.env.TNT_USER_NAME, "test");

    // Tester le suivi d’un colis
    const result = await tnt.tracking(req.body.bon_transport);
    res.status(200).send(result);

  } catch (error) {
    console.error('Error consultation shopify:', error);
    res.status(500).send('Error consultation shopify');
  }
}

module.exports = { 
  trackpackage
};