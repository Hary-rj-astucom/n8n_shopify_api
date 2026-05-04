const sequelize = require("../../config/database.js");

const getTicketSummary = async (req, res) => {
  try{

    ticket_status = req.body.ticket_status; // -> all | en attente | en cours | cloture
    date_range = req.body.date_range; // -> 0 : 7 jours | 1 : 15 jours | 2 : 1 mois | 3 : 3 mois | 4 : 6 mois | 5 : 1 ans 

    where = " 1 = 1 ";
    switch(ticket_status){
      case "all":
        where = " 1 = 1 ";
        break;
      case "en attente":
        where = " status = 'en attente' ";
        break;
      case "en cours":
        where = " status = 'en cours' "
        break;
      case "cloture":
        where = " status = 'cloture' "
        break;
    }

    sql="";
    let result;
    switch (date_range) {
      case 0: // 7 jours
        sql = `SELECT 
                COUNT(*) AS nombre, 
                DATE(created_at) AS period
            FROM ticket
            WHERE DATE(created_at) BETWEEN (
                    SELECT DATE_SUB(MAX(created_at), INTERVAL 7 DAY) 
                    FROM ticket
                )
                AND (
                    SELECT MAX(created_at) 
                    FROM ticket
                )
                AND ${where}
            GROUP BY DATE(created_at)
            ORDER BY period
            `;
        result = await sequelize.query(sql, {
          replacements: [],
          type: sequelize.QueryTypes.SELECT
        }); 
     
        break;
      case 1: // 15 jours
        sql = `SELECT 
                COUNT(*) AS nombre, 
                DATE(created_at) AS period
            FROM ticket
            WHERE DATE(created_at) BETWEEN (
                    SELECT DATE_SUB(MAX(created_at), INTERVAL 15 DAY) 
                    FROM ticket
                )
                AND (
                    SELECT MAX(created_at) 
                    FROM ticket
                )
                AND ${where}
            GROUP BY DATE(created_at)
            ORDER BY period
            `;
        result = await sequelize.query(sql, {
          replacements: [],
          type: sequelize.QueryTypes.SELECT
        }); 

        break;
      case 2: // 1 mois
        sql = `SELECT 
                  COUNT(*) AS nombre,
                  YEARWEEK(created_at, 1) AS period
              FROM ticket
              WHERE DATE(created_at) BETWEEN (
                      SELECT DATE_SUB(MAX(created_at), INTERVAL 1 MONTH) 
                      FROM ticket
                  )
                  AND (
                      SELECT MAX(created_at) 
                      FROM ticket
                  )
                  AND ${where} 
              GROUP BY YEARWEEK(created_at, 1)
              ORDER BY period
              `;
        result = await sequelize.query(sql, {
          replacements: [],
          type: sequelize.QueryTypes.SELECT
        }); 

        break;
      case 3: // 3 mois
        sql = `SELECT 
                  COUNT(*) AS nombre,
                  DATE_FORMAT(created_at, '%Y-%m') AS period
              FROM ticket
              WHERE DATE(created_at) BETWEEN (
                      SELECT DATE_SUB(MAX(created_at), INTERVAL 3 MONTH) 
                      FROM ticket
                  )
                  AND (
                      SELECT MAX(created_at) 
                      FROM ticket
                  )
                  AND ${where} 
              GROUP BY YEAR(created_at), MONTH(created_at)
              ORDER BY period
              `;
        result = await sequelize.query(sql, {
          replacements: [],
          type: sequelize.QueryTypes.SELECT
        }); 

        break;
      case 4: // 6 mois
        sql = `SELECT 
                  COUNT(*) AS nombre,
                  DATE_FORMAT(created_at, '%Y-%m') AS period
              FROM ticket
              WHERE DATE(created_at) BETWEEN (
                      SELECT DATE_SUB(MAX(created_at), INTERVAL 6 MONTH) 
                      FROM ticket
                  )
                  AND (
                      SELECT MAX(created_at) 
                      FROM ticket
                  )
                  AND ${where} 
              GROUP BY YEAR(created_at), MONTH(created_at)
              ORDER BY period
              `;
        result = await sequelize.query(sql, {
          replacements: [],
          type: sequelize.QueryTypes.SELECT
        }); 

        break;
      case 5: // 1 ans
        sql = `SELECT 
                  COUNT(*) AS nombre,
                  DATE_FORMAT(created_at, '%Y-%m') AS period
              FROM ticket
              WHERE DATE(created_at) BETWEEN (
                      SELECT DATE_SUB(MAX(created_at), INTERVAL 12 MONTH) 
                      FROM ticket
                  )
                  AND (
                      SELECT MAX(created_at) 
                      FROM ticket
                  )
                  AND ${where} 
              GROUP BY YEAR(created_at), MONTH(created_at)
              ORDER BY period
              `;
          result = await sequelize.query(sql, {
            replacements: [],
            type: sequelize.QueryTypes.SELECT
          }); 

        break;
    }

    let total = 0;
    result.forEach(e => {
      total += e.nombre;
    });

    return res.json({
      total: total,
      details: result
    });

  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
}

const getDonutSummary = async (req, res) => {
  try {

    let where = " WHERE 1=1 "

    if(req.body.month != "all"){
      where += ` AND MONTH(created_at) = ${req.body.month} `;
    }
    if(req.body.year != "all"){
      where += ` AND YEAR(created_at) = ${req.body.year} `;
    }
   
    if(req.body.project_id && req.body.project_id != 'all'){
      where += ` AND project_id = ${req.body.project_id}`;
    }

    let sql = `SELECT 
      count(ticket.id) as nb, label.id as label_id, label.name as label_name 
      FROM ticket 
      RIGHT JOIN label ON label.id = ticket.label_id 
      ${ where }
      GROUP BY label_id, label.name`;

    result = await sequelize.query(sql, {
      replacements: [],
      type: sequelize.QueryTypes.SELECT
    });

    return res.json({
      details: result
    });

  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
}

const getTicketPartitionSummary = async (req, res) => {
  try {

    let where = "";
    if(req.body.project_id && req.body.project_id != 'all'){
      where = ` AND project_id = ${ req.body.project_id }`;
    }

    let sql = `SELECT 
      DATE(created_at) as date, 
      SUM(CASE 
          WHEN label_id = 1 THEN 1
          ELSE 0
        END) as suivi_commande,
        SUM(CASE 
          WHEN label_id = 2 THEN 1
          ELSE 0
        END) as colis_non_recu,
        SUM(CASE 
          WHEN label_id = 3 THEN 1
          ELSE 0
        END) as paiement,
        SUM(CASE 
          WHEN label_id = 4 THEN 1
          ELSE 0
        END) as facture_non_recu,
        SUM(CASE 
          WHEN label_id = 5 THEN 1
          ELSE 0
        END) as produit_defectueux,
        SUM(CASE 
          WHEN label_id = 6 THEN 1
          ELSE 0
        END) as retour_retractation,
        SUM(CASE 
          WHEN label_id = 7 THEN 1
          ELSE 0
        END) as demande_specifique,
        SUM(CASE 
          WHEN label_id = 8 THEN 1
          ELSE 0
        END) as colis_vide,
        SUM(CASE 
          WHEN label_id = 9 THEN 1
          ELSE 0
        END) as spam_publicite,
        SUM(CASE 
          WHEN label_id = 10 THEN 1
          ELSE 0
        END) as changement_adresse_livraison,
        SUM(CASE 
          WHEN label_id = 11 THEN 1
          ELSE 0
        END) as inversion_colis
    FROM ticket 
    WHERE DATE(created_at) BETWEEN DATE_SUB(now(), INTERVAL 30 DAY) AND DATE(now()) ${where}
    GROUP BY DATE(created_at)`;

    result = await sequelize.query(sql, {
      replacements: [],
      type: sequelize.QueryTypes.SELECT
    });

    return res.json({
      details: result
    });

  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
}

const getRedudantRequest = async (req, res) => {
  try{

    let sql = `SELECT COUNT(*) as nb_reccurent, SUM(total_in_group) as total_mail_trigered FROM ranked_tiket_list`;

    result = await sequelize.query(sql, {
      replacements: [],
      type: sequelize.QueryTypes.SELECT
    });

    return res.json({
      details: result
    });

  }catch (error) {
    console.error("Erreur dans getRedudantRequest:", error);
    return res.status(400).json({ error: error.message });
  }
}

// --------------------------------- //
//           User stat               //
// --------------------------------- //

async function getUserPivot(month, year) {
  try {
    // Construire dynamiquement les colonnes
    const [pivotColsResult] = await sequelize.query(`
      SELECT GROUP_CONCAT(DISTINCT
        CONCAT(
          'SUM(CASE WHEN name = ''',
          name,
          ''' THEN nb_action ELSE 0 END) AS \`',
          name, '\`'
        )
      ) AS pivot_columns
      FROM (
        SELECT user.name 
        FROM user WHERE email NOT IN ('hrajaonah@astucom.com', 'mphrygien@astucom.com', 'adv@cosma-parfumeries.fr', 'gpa@techmode-group.com', 'jpanier@techmode-group.com')
      ) AS base
    `);

    const pivotColumns = pivotColsResult[0]?.pivot_columns;
    if (!pivotColumns) {
      throw new Error("Impossible de générer les colonnes dynamiques (aucune donnée trouvée).");
    }

    // Construire la requête finale
    const finalQuery = `
      SELECT date, ${pivotColumns}
      FROM (
        SELECT COUNT(*) AS nb_action, user_id, user.name, DATE(created_at) AS date
        FROM ticket_historical_comment
        JOIN user ON user_id = user.id
        WHERE YEAR(created_at) = :year AND MONTH(created_at) := month
        GROUP BY DATE(created_at), user_id, user.name
      ) AS data
      GROUP BY date ORDER BY date
    `;

    // Exécuter la requête finale
    const result = await sequelize.query(finalQuery, { 
      replacements: { month, year },
      type: sequelize.QueryTypes.SELECT 
    });

    return result;

  } catch (error) {
    console.error("Erreur dans getUserPivot:", error);
    throw error;
  }
}

const getUserActivitySummary = async (req, res) =>{
  try {

    const d = new Date();
    const month = req.body.month ?? (d.getMonth() + 1);
    const year  = req.body.year  ?? d.getFullYear();

    const data = await getUserPivot(month, year);

    // console.log(data);

    return res.json({
      details: data
    });

  } catch (error) {
    console.error("Erreur dans getUserPivot:", error);
    return res.status(400).json({ error: error.message });
  }
}

async function formatUserActivity(rows) {
  const grouped = {};

  for (const row of rows) {
    const date = row.date;
    const name = row.name;

    if (!grouped[date]) {
      grouped[date] = { date };
    }

    grouped[date][name] = {
      total_action: row.total_action,
      answer_mail: row.answer_customer,
      mark_as_read: row.mark_as_read,
      pending_ticket: row.pending_ticket,
      in_progress_ticket: row.in_progress_ticket,
      closed_ticket: row.closed_ticket
    };
  }

  return Object.values(grouped);
}

const getUserActivitySummary2 = async (req, res) => {
  try {

    const date_start = req.body.date_start;
    let date_end = req.body.date_end;
    let d = new Date(date_end);
    d.setDate(d.getDate() + 1);

    // si tu veux garder format YYYY-MM-DD
    date_end = d.toISOString().split('T')[0];

    const finalQuery = `
      SELECT 
        d.date,
        u.id AS user_id,
        u.name,

        COALESCE(COUNT(thc.id), 0) AS total_action,

        COALESCE(SUM(CASE 
            WHEN thc.comment LIKE '%a repondu(e) au client%' THEN 1
            ELSE 0 
        END), 0) AS answer_customer,

        COALESCE(SUM(CASE 
            WHEN thc.comment LIKE '%Reponse du client ignoree%' THEN 1
            ELSE 0 
        END), 0) AS mark_as_read,

        COALESCE(SUM(CASE 
            WHEN thc.comment LIKE '%Ticket mis à jour%' 
            AND thc.comment LIKE '%[en attente]%' THEN 1
            ELSE 0 
        END), 0) AS pending_ticket,

        COALESCE(SUM(CASE 
            WHEN thc.comment LIKE '%Ticket mis à jour%' 
            AND thc.comment LIKE '%[en cours]%' THEN 1
            ELSE 0 
        END), 0) AS in_progress_ticket,

        COALESCE(SUM(CASE 
            WHEN thc.comment LIKE '%Ticket mis à jour%' 
            AND thc.comment LIKE '%[cloture]%' THEN 1
            ELSE 0 
        END), 0) AS closed_ticket

      FROM (
          SELECT DISTINCT DATE(created_at) AS date
          FROM ticket_historical_comment
          WHERE created_at BETWEEN :date_start AND :date_end
      ) d

      CROSS JOIN \`user\` u

      LEFT JOIN ticket_historical_comment thc 
          ON thc.user_id = u.id
          AND DATE(thc.created_at) = d.date
          AND thc.created_at BETWEEN :date_start AND :date_end

      WHERE u.email NOT IN (
          'hrajaonah@astucom.com',
          'mphrygien@astucom.com',
          'adv@cosma-parfumeries.fr',
          'gpa@techmode-group.com',
          'jpanier@techmode-group.com'
      )

      GROUP BY d.date, u.id, u.name

      ORDER BY d.date ASC, u.name ASC
    `;

    const result = await sequelize.query(finalQuery, { 
      replacements: { date_start, date_end },
      type: sequelize.QueryTypes.SELECT 
    });

    let final_result = await formatUserActivity(result);

    return res.json({
      details: final_result
    });
   
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports = {
  getTicketSummary,
  getDonutSummary,
  getTicketPartitionSummary,
  getUserActivitySummary,
  getUserActivitySummary2,
  getRedudantRequest
};
