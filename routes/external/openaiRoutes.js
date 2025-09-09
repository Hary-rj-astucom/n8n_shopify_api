const express = require('express');
const openaiController = require('../../controllers/external/OpenAiController');

const router = express.Router();

//Shopify format
router.post('/translateandcorrect', openaiController.translate);

module.exports = router;