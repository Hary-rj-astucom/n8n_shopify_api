const PrestashopApiService = require('../../services/PrestashopApiService');

const getOrderWithTransactionsByNumber = async (req, res) => {
  try {

    let result = await PrestashopApiService.getOrderByReference(req.body.order_num);
    res.status(200).send(result);

  } catch (error) {
    console.log('Error consultation prestashop:', error);
    res.status(500).send('Error consultation prestashop : ' + error.response?.data?.message);
  }
}

module.exports = { 
  getOrderWithTransactionsByNumber
};