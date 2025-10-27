const express = require("express");
const dashboardController = require("../../controllers/backoffice/DashboardController");

const router = express.Router();

router.post("/getticketsummary", dashboardController.getTicketSummary);
router.post("/getdonutSummary", dashboardController.getDonutSummary);
router.post("/getticketpartitionsummary", dashboardController.getTicketPartitionSummary);

module.exports = router;