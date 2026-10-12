const express = require('express');
const prestashopDigiparfController = require('../../controllers/external/PrestashopDigiparfController');

const router = express.Router();

router.post('/getOrderWithTransactionsByRefOrByEmail', prestashopDigiparfController.getOrderWithTransactionsByRefOrByEmail);
router.post('/getInvoiceByRefOrByEmail', prestashopDigiparfController.getInvoiceByRefOrByEmail);

module.exports = router;