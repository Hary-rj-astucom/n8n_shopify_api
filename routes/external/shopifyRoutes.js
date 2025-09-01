const express = require('express');
const shopifyController = require('../../controllers/external/ShopifyController');

const router = express.Router();

//Shopify format
router.post('/getOrderByOrderNumber', shopifyController.getOrderByOrderNumber);

module.exports = router;