const express = require('express');
const magentoController = require('../../controllers/external/MagentoController');

const router = express.Router();

//Shopify format
router.post('/getOrderWithTransactionsByNumber', magentoController.getOrderWithTransactionsByNumber);
router.post('/getOrderWithInvoiceByNumber', magentoController.getOrderWithInvoiceByNumber);

module.exports = router;