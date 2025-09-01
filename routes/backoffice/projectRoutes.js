const express = require("express");
const projectController = require("../../controllers/backoffice/ProjectController.js");

const router = express.Router();

router.get("/", projectController.getProjects);
router.delete("/:id", projectController.deleteProject);

module.exports = router;