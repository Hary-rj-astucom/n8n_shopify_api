const express = require("express");
const ticketController = require("../../controllers/backoffice/TicketController");

const router = express.Router();

router.get("/", ticketController.getTickets);

module.exports = router;