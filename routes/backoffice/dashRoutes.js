const express = require("express");
const dashboardController = require("../../controllers/backoffice/DashboardController");

const router = express.Router();

router.post("/getticketsummary", dashboardController.getTicketSummary);

module.exports = router;