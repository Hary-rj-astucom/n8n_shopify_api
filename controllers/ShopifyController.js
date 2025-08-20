const ShopifyApiService = require('../services/ShopifyApiService');

const getOrderByOrderNumber = async (req, res) => {
  try {

    let result = getOrderByOrderNumber(req.body.orderNumber);
    res.status(200).send(result);

  } catch (error) {
    console.error('Error consultation shopify:', error);
    res.status(500).send('Error consultation shopify');
  }
}

module.exports = { 
    getOrderByOrderNumber
};