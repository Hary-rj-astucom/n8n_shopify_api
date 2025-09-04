const express = require("express");
const ticketController = require("../../controllers/backoffice/TicketController");

const router = express.Router();

router.get("/", ticketController.getTickets);
router.get("/:id", ticketController.getTicketsDetails);
router.put("/:id", ticketController.updateTicketDetails);
router.delete("/:id", ticketController.deleteTicket);

router.post("/replymail", ticketController.respondMail);

module.exports = router;