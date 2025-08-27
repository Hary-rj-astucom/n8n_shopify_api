const express = require('express');
const magentoController = require('../controllers/MagentoController');

const router = express.Router();

//Shopify format
router.post('/getOrderWithTransactionsByNumber', magentoController.getOrderWithTransactionsByNumber);

module.exports = router;