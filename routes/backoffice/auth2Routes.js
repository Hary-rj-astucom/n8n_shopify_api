const express = require("express");
const { changePassword } = require("../../controllers/backoffice/AuthController.js");

const router = express.Router();
router.post("/changePassword", changePassword);

module.exports = router;