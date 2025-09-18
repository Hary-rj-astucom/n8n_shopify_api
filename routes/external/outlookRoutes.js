const express = require('express');
const outlookController = require('../../controllers/external/OutlookController');

const router = express.Router();

router.post('/getConversation', outlookController.getConversationThreads);
router.post('/replayMessage', outlookController.getReplayMessage);

module.exports = router;