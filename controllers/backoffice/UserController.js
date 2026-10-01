const User = require("../../models/User.js");
const sequelize = require("../../config/database.js");
const UserProject = require("../../models/UserProject.js");
const bcrypt = require("bcryptjs");
const uniqid = require('uniqid');

const createUser = async (req, res) => {
  try {
    const password = uniqid();
    const hashedPassword = await bcrypt.hash(password, 10);
    req.body.password = hashedPassword;
    let user = await User.create(req.body);
    res.status(201).json({user : user, generate_password : password});
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const regeneratePassword = async (req, res) => {
  try {
    const password = uniqid().toUpperCase();
    const hashedPassword = await bcrypt.hash(password, 10);
    const [updated] = await User.update({password : hashedPassword}, { where: { id: req.params.id } });
    updated ? res.status(201).json({message: "Password updated", generate_password : password}) : res.status(404).json({ error: "User not found" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      where: { state: 1}
    });
    res.json(users);
  } catch (err) {
    console.dir(err);
    res.status(500).json({ error: err.message });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] }
    });
    user ? res.json(user) : res.status(404).json({ error: "User not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const [updated] = await User.update(req.body, { where: { id: req.params.id } });
    updated ? res.json({ message: "User updated" }) : res.status(403).json({ error: "Incorrect data" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const deleted = await User.destroy({ where: { id: req.params.id } });
    deleted ? res.json({ message: "User deleted" }) : res.status(404).json({ error: "User not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// get assignation project
const getProjectUserAssignation = async (req, res) => {
  try {

    const dataQueryComment = `
      SELECT user_project.id as user_project_id, user_id, project_id, project.name as project_name 
      FROM user_project 
      JOIN project ON project.id = user_project.project_id 
      WHERE user_id = ? ORDER BY user_project.id ASC
    `;
    let params = [req.params.user_id]
    const result = await sequelize.query(dataQueryComment, {
      replacements: params,
      type: sequelize.QueryTypes.SELECT
    });

    res.status(200).json({result});

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// affect user to a project
const affectUserToProject = async (req, res) => {
  try {

    let userproject = await UserProject.create(req.body);
    res.status(201).json({user_project: userproject});

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// delete project affectation 
const retireUserFromProject = async (req, res) => {
  try {

    const deleted = await UserProject.destroy({ where: { id: req.params.userprojectid } });
    deleted ? res.json({ message: "Assignation deleted" }) : res.status(404).json({ error: "Assignation not found" });    

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  regeneratePassword,

  getProjectUserAssignation,
  affectUserToProject,
  retireUserFromProject
};
