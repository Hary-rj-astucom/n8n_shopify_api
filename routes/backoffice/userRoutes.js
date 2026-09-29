const express = require("express");
const UserController = require("../../controllers/backoffice/UserController.js");

const router = express.Router();

router.post("/", UserController.createUser);
router.get("/", UserController.getUsers);
router.get("/:id", UserController.getUser);
router.get("/:id/regeneratepassword", UserController.regeneratePassword);
router.put("/:id", UserController.updateUser);
router.delete("/:id", UserController.deleteUser);


router.get("/userproject/:user_id", UserController.getProjectUserAssignation);
router.post("/userproject", UserController.affectUserToProject);
router.delete("/userproject/:userprojectid", UserController.retireUserFromProject);

module.exports = router;