require('dotenv').config();
const LandmarkTracking = require('../../services/LandmarkApiService');

const trackpackage = async (req, res) => {
  try {
    const landmark = new LandmarkTracking();

    // Tester le suivi d’un colis
    const result = await landmark.track(req.body.bon_transport_landmark);
    res.status(200).send(result);

  } catch (error) {
    console.error('Error consultation landmark:', error.message);
    res.status(200).send('Error consultation landmark : ' + error.message);
  }
}

module.exports = { 
  trackpackage
};