const MondialRelayApiService = require('../../services/MondialRelayApiService');

const trackPackageByNum = async (req, res) => {
  try {

    let result = await MondialRelayApiService.trackShipment(req.body.expedition_number);
    res.status(200).send(result);

  } catch (error) {
    console.log('Error consultation mondial relay:', error);
    res.status(200).send('Error consultation mondial relay : ' + error.response?.data?.message);
  }
}

module.exports = { 
  trackPackageByNum
};