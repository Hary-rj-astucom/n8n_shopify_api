const express = require("express");
const ticketController = require("../../controllers/backoffice/TicketController");

const router = express.Router();

router.get("/", ticketController.getTickets);
router.get("/:id", ticketController.getTicketsDetails);
router.post("/", ticketController.createTicket);
router.put("/:id", ticketController.updateTicketDetails);
router.delete("/:id", ticketController.deleteTicket);

module.exports = router;