const express = require('express');
const outlookController = require('../../controllers/external/OutlookController');

const router = express.Router();

//Shopify format
router.post('/getConversation', outlookController.getConversationThreads);

module.exports = router;