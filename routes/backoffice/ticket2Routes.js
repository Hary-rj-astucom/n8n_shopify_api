const express = require("express");
const ticketController = require("../../controllers/backoffice/TicketController");

const router = express.Router();
router.post("/", ticketController.createTicket);

module.exports = router;