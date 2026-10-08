const express = require('express');
const outlookController = require('../../controllers/external/OutlookController');

const router = express.Router();

router.post('/getConversation', outlookController.getConversationThreads);
router.post('/replayMessage', outlookController.getReplayMessage);

router.post('/digiparf/getFullBodyMessage', outlookController.getFullMessageMailDigiparf);
router.post('/kalista/getFullBodyMessage', outlookController.getFullMessageMailKalista);
router.post('/lplc/getFullBodyMessage', outlookController.getFullMessageMailLplc);

module.exports = router;