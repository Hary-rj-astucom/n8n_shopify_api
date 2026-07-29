const express = require("express");
const ChatbotController = require("../../controllers/backoffice/ChatbotController");

const router = express.Router();

router.post("/getchatmessage", ChatbotController.getChatMessage);

module.exports = router;