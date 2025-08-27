const express = require('express');
const prestashopController = require('../controllers/PrestashopController');

const router = express.Router();

//Shopify format
router.post('/getOrderWithTransactionsByNumber', prestashopController.getOrderWithTransactionsByNumber);

module.exports = router;