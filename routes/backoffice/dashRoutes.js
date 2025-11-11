const express = require("express");
const dashboardController = require("../../controllers/backoffice/DashboardController");

const router = express.Router();

router.post("/getticketsummary", dashboardController.getTicketSummary);
router.post("/getdonutSummary", dashboardController.getDonutSummary);
router.post("/getticketpartitionsummary", dashboardController.getTicketPartitionSummary);
router.post("/getuseractivitysummary", dashboardController.getUserActivitySummary);

router.post("/getRedudantRequest", dashboardController.getRedudantRequest);

module.exports = router;