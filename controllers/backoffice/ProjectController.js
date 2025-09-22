const Project = require("../../models/Project.js");

const getProjects = async (req, res) => {
  try {
    let projects = await Project.findAll({ where: { state: 1 } });

    for (let a = 0; a < projects.length; a++) {
      let [pending] = await sequelize.query(
        `SELECT count(*) as nb 
         FROM ticket 
         WHERE project_id = ? 
           AND status = "en attente" 
           AND state = 1`,
        {
          replacements: [projects[a].id],
          type: sequelize.QueryTypes.SELECT
        }
      );
      projects[a].pending_ticket = pending.nb || 0;

      let [in_progress] = await sequelize.query(
        `SELECT count(*) as nb 
         FROM ticket 
         WHERE project_id = ? 
           AND status = "en cours" 
           AND state = 1`,
        {
          replacements: [projects[a].id],
          type: sequelize.QueryTypes.SELECT
        }
      );
      projects[a].in_progress_ticket = in_progress.nb || 0;

      let [closed] = await sequelize.query(
        `SELECT count(*) as nb 
         FROM ticket 
         WHERE project_id = ? 
           AND status = "cloture" 
           AND state = 1`,
        {
          replacements: [projects[a].id],
          type: sequelize.QueryTypes.SELECT
        }
      );
      projects[a].closed_ticket = closed.nb || 0;
    }

    res.json(projects);
  } catch (err) {
    console.error(err);
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
