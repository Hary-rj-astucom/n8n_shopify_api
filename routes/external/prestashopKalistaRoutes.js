const express = require('express');
const prestashopKalistaController = require('../../controllers/external/PrestashopKalistaController');

const router = express.Router();

router.post('/getOrderWithTransactionsByNumber', prestashopKalistaController.getOrderWithTransactionsByNumber);
router.post('/getLastOrderWithTransactionsByEmail', prestashopKalistaController.getLastOrderWithTransactionsByEmail);
router.post('/getOrderWithTransactionsByRefOrByEmail', prestashopKalistaController.getOrderWithTransactionsByRefOrByEmail);
router.post('/getInvoiceByRefOrByEmail', prestashopKalistaController.getInvoiceByRefOrByEmail);

module.exports = router;