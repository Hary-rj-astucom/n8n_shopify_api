const express = require("express");
const ticketController = require("../../controllers/backoffice/TicketController");

const router = express.Router();

router.get("/", ticketController.getTickets);
router.get("/:id", ticketController.getTicketsDetails);
router.put("/:id", ticketController.updateTicketDetails);
router.delete("/:id", ticketController.deleteTicket);

router.post("/replymail", ticketController.respondMail);
router.post("/ignoreclientresponse", ticketController.ignoreClientResponse);
router.post("/addcomment", ticketController.addTicketComment);

router.get("/list/getRedudentTicket", ticketController.getRedudentTicket);
router.post("/getDetailRedudentTicket", ticketController.getDetailRedudentTicket);

router.post("/replymail2", ticketController.respondMail2);

router.post("/getOutlookDigiparfMessageDetailByMessageId", ticketController.getOutlookDigiparfMessageDetailByMessageId);

module.exports = router;