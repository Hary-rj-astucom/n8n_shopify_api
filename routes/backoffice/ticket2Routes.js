const express = require("express");
const ticketController = require("../../controllers/backoffice/TicketController");

const router = express.Router();
router.post("/", ticketController.createTicket);
router.post("/verifconv", ticketController.getTicketsbyConvId);
router.post("/verifsimilarticket", ticketController.getSimilarTicket);

router.post("/markAsUnread", ticketController.markAsUnread);

module.exports = router;