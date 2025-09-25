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
            ORDER BY period DESC
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
            ORDER BY period DESC
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
              ORDER BY period DESC
              `;
        result = await sequelize.query(sql, {
          replacements: [],
          type: sequelize.QueryTypes.SELECT
        }); 

        break;
      case 3: // 3 mois
        sql=`SELECT 
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
              ORDER BY period DESC
              `;
        result = await sequelize.query(sql, {
          replacements: [],
          type: sequelize.QueryTypes.SELECT
        }); 

        break;
      case 4: // 6 mois
        sql=`SELECT 
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
              ORDER BY period DESC
              `;
        result = await sequelize.query(sql, {
          replacements: [],
          type: sequelize.QueryTypes.SELECT
        }); 

        break;
      case 5: // 1 ans
        sql=`SELECT 
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
              ORDER BY period DESC
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

module.exports = {
  getTicketSummary
};
