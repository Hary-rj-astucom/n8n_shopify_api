const ColissimoApiService = require('../services/ColissimoApiService');

const trackOrder = async (req, res) => {
  try {

    let result = await ColissimoApiService.trackColissimo(req.body.trackingNumber);
    res.status(200).send(result);

  } catch (error) {
    console.error('Error consultation colissimo:', error);
    res.status(500).send('Error consultation colissimo');
  }
}

module.exports = { 
    trackOrder
};