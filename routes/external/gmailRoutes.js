const express = require('express');
const gmailController = require('../../controllers/external/GmailController');

const router = express.Router();

//Shopify format
router.get('/auth', gmailController.auth);
router.get('/callback', gmailController.callback);

router.post('/senddraft', gmailController.senddraft);

module.exports = router;