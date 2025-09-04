const Project = require("../../models/Project.js");

const getTickets = async (req, res) => {
  try {
    const perPage = parseInt(req.query.per_page) || 10;
    let page = Math.max(1, parseInt(req.query.page) || 1);
    let offset = (page - 1) * perPage;

    let subQuery = '';
    let paramsTotal = [];
    let params = [];

    // 🔍 Global search
    if (req.query.search) {
      const search = `%${req.query.search}%`;
      subQuery += ` AND (
        commande.id LIKE ? OR 
        magasin.name LIKE ? OR 
        commande.libelle LIKE ? OR 
        fournisseur.name LIKE ? OR 
        commande.montant_total LIKE ? OR 
        commande.status LIKE ? OR 
        commande.etat LIKE ?
      )`;

      paramsTotal.push(search, search, search, search, search, search, search);
      params.push(search, search, search, search, search, search, search);
    }

    // 🔍 Multi-criteria filters
    const multiFields = [
      "commande.id",
      "magasin.name",
      "commande.libelle",
      "fournisseur.name",
      "commande.montant_total",
      "commande.status",
      "commande.etat"
    ];

    for (const field of multiFields) {
      const key = field.replace('.', '_'); // ex: magasin.name → magasin_name
      if (req.query[key]) {
        const likeValue = `%${req.query[key]}%`;
        subQuery += ` AND ${field} LIKE ?`;
        paramsTotal.push(likeValue);
        params.push(likeValue);
      }
    }

    // 🧮 Total count
    const totalQuery = `
      SELECT COUNT(*) as nb 
      FROM commande 
      JOIN fournisseur ON fournisseur.id = commande.fournisseur_id
      JOIN magasin ON magasin.id = commande.magasin_livraison_id
      WHERE 1=1 ${subQuery}
    `;
    const [resultTotal] = await sequelize.query(totalQuery, {
      replacements: paramsTotal,
      type: sequelize.QueryTypes.SELECT
    });

    const total = resultTotal.nb || 0;
    const nbPage = Math.ceil(total / perPage);

    // Reset page if too big
    if (page > nbPage) {
      page = 1;
      offset = 0;
    }

    // 📄 Paginated data
    const dataQuery = `
      SELECT 
        commande.id as commande_id,
        magasin.name as magasin_livraison,
        commande.libelle,
        fournisseur.name as fournisseur,
        commande.montant_total,
        commande.status,
        commande.etat,
        commande.created_at
      FROM commande
      JOIN fournisseur ON fournisseur.id = commande.fournisseur_id
      JOIN magasin ON magasin.id = commande.magasin_livraison_id
      WHERE 1=1 ${subQuery}
      LIMIT ? OFFSET ?
    `;
    params.push(perPage, offset);

    const result = await sequelize.query(dataQuery, {
      replacements: params,
      type: sequelize.QueryTypes.SELECT
    });

    return res.json({
      total_item: total,
      per_page: perPage,
      total_page: nbPage,
      current_page: page,
      data: result
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getProjects
};
