const express = require('express');
const prestashopLplcController = require('../../controllers/external/PrestashopLplcController');

const router = express.Router();

router.post('/getOrderWithTransactionsByNumber', prestashopLplcController.getOrderWithTransactionsByNumber);
router.post('/getLastOrderWithTransactionsByEmail', prestashopLplcController.getLastOrderWithTransactionsByEmail);
router.post('/getOrderWithTransactionsByRefOrByEmail', prestashopLplcController.getOrderWithTransactionsByRefOrByEmail);
router.post('/getInvoiceByRefOrByEmail', prestashopLplcController.getInvoiceByRefOrByEmail);

module.exports = router;