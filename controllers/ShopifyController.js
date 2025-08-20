const ShopifyApiService = require('../services/ShopifyApiService');

const testupdateshopify = async (req, res) => {
  try {

    let result = "true";
    res.status(200).send('Updated');

  } catch (error) {
    console.error('Error update shopify:', error);
    res.status(500).send('Error update shopify');
  }
}

module.exports = { 
    testupdateshopify
};