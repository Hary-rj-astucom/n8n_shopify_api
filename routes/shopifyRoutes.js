const express = require('express');
const shopifyController = require('../controllers/ShopifyController');

const router = express.Router();

//Shopify format
router.post('/getOrderByOrderNumber', shopifyController.getOrderByOrderNumber);

module.exports = router;