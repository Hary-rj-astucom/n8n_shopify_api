const MondialRelayApiService = require('../services/MondialRelayApiService');

const trackPackageByNum = async (req, res) => {
  try {

    let result = await MondialRelayApiService.getShipmentStatus(req.body.expedition_number, req.body.langue);
    res.status(200).send(result);

  } catch (error) {
    console.log('Error consultation mondial relay:', error);
    res.status(500).send('Error consultation mondial relay : ' + error.response?.data?.message);
  }
}

module.exports = { 
  trackPackageByNum
};