const Project = require("../../models/Project.js");

const getProjects = async (req, res) => {
  try {
    const projects = await Project.findAll({ where: { state: 1 } });
    res.json(projects);
  } catch (err) {
    console.dir(err);
    res.status(500).json({ error: err.message });
  }
};

const deleteProject = async (req, res) => {
  try {
    const [updated] = await Project.update({ state : 2}, { where: { id: req.params.id } });
    updated ? res.json({ message: "Project deleted" }) : res.status(404).json({ error: "Project not found" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  getProjects,
  deleteProject
};
