const express = require('express');
const gmailController = require('../../controllers/external/GmailController');

const router = express.Router();

//Shopify format
router.get('/auth', gmailController.auth);
router.get('/callback', gmailController.callback);

module.exports = router;