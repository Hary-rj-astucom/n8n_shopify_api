const express = require('express');
const shopifyController = require('../controllers/ShopifyController');

const router = express.Router();

//Shopify format
router.post('/test-one', shopifyController.testupdateshopify);

module.exports = router;