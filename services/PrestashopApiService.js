require('dotenv').config();
const axios = require('axios');

const OutlookDigiparfApiService = require('./OutlookDigiparfApiService');

const XLSX = require('xlsx');
const path = require('path');
const fs   = require('fs');

// Configuration de l'API PrestaShop
// const apiKey = "EYY3MPK7IK2M59SANQYCLDU7E1F2XFXA";
// const shopUrl = "https://www.digiparf.com"; // Remplacez par votre URL

const apiKey = process.env.PRESTASHOP_API_KEY;
const shopUrl = process.env.PRESTASHOP_URL;

const shopUrlDigiparf = process.env.PRESTASHOP_DIGIPARF_URL;
const shopUrlHelfrich = process.env.PRESTASHOP_HELFRICH_URL;
const shopUrlUniverscse = process.env.PRESTASHOP_UNIVERSCSE_URL;

const shopUrlAmbitioncse = process.env.PRESTASHOP_AMBITIONCSE_URL;
const shopUrlClubulys = process.env.PRESTASHOP_CLUBULYS_URL;
const shopUrlReducce = process.env.PRESTASHOP_REDUCCE_URL;

const apiUrlDigiparf = `${shopUrlDigiparf}/api/`;
const apiUrlHelfrich = `${shopUrlHelfrich}/api/`;
const apiUrlUniversce = `${shopUrlUniverscse}/api/`;

const apiUrlAmbitioncse = `${shopUrlAmbitioncse}/api/`;
const apiUrlClubulys = `${shopUrlClubulys}/api/`;
const apiUrlReducce = `${shopUrlReducce}/api/`;

const TRACKING_URLS = {
  colissimo: (n) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(n)}`,
  chronopost: (n) => `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodeURIComponent(n)}`,
  mondialrelay: (n) => `https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${encodeURIComponent(n)}`,
};

function buildTrackingUrl(carrier, track_number) {
  const code = (carrier.external_module_name || "").toLowerCase();
  const key = Object.keys(TRACKING_URLS).find((k) => code.includes(k));
  return key ? TRACKING_URLS[key](track_number) : null;
}

// Fonction générique pour appeler l'API PrestaShop
async function callPrestaShopAPI(url) {
  try {
    const response = await axios.get(url, {
      auth: {
        username: apiKey,
        password: "",
      },
      timeout: 30000,
      httpsAgent: new (await import("https")).Agent({ rejectUnauthorized: false }),
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Erreur HTTP: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else {
      throw new Error(`Erreur Axios: ${error.message}`);
    }
  }
}

// Récupérer une commande spécifique
async function getOrderById(apiUrl, order_id) {
  const url = `${apiUrl}orders/${order_id}?output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.order ?? null;
}

// Récupérer un client par ID
async function getCustomerById(apiUrl, customerId) {
  const url = `${apiUrl}customers/${customerId}?output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.customer ?? null;
}

// Récupérer un statut de commande
async function getOrderStateById(apiUrl, stateId) {
  const url = `${apiUrl}order_states/${stateId}?output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.order_state ?? null;
}

// Récupérer les produits d’une commande
async function getOrderDetails(apiUrl, order_id) {
  const url = `${apiUrl}order_details?filter[id_order]=${order_id}&output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.order_details ?? [];
}

// Recuperer les information de transaction
async function getOrderPayement(apiUrl, order_id) {
  const url = `${apiUrl}order_payments?filter[order_reference]=${order_id}&output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  let result = [];
  if(data.order_payments){
    if(data.order_payments.length > 0){
      for(let a=0; a<data.order_payments.length; a++){
        result.push(await getOrderPayementDetail(apiUrl, data.order_payments[0].id)); 
      }
      return result;    
    }else{
      return [];
    }
  }else{
    return [];
  }
}

// Recuperation des data de l'info payement
async function getOrderPayementDetail(apiUrl, order_payment_id) {
  const url = `${apiUrl}order_payments/${order_payment_id}?output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.order_payment ?? [];
}

async function getTracking(apiUrl, orderId) {
  try {
    const url = `${apiUrl}order_carriers?filter[id_order]=${orderId}&display=full&output_format=JSON`;
    const data = await callPrestaShopAPI(url);
    const orderCarriers = data.order_carriers ?? [];

    const tracks = [];
    for (const oc of orderCarriers) {

      if(oc.id_carrier){

        const carrier_url = `${apiUrl}carriers/${oc.id_carrier}&output_format=JSON`;
        const data2 = await callPrestaShopAPI(carrier_url);

        const url = buildTrackingUrl(data2.carrier, oc.tracking_number);

        tracks.push({
          id_carrier: oc.id_carrier,
          tracking_number: oc.tracking_number,
          tracking_url: url
        });

      }
      else {
        tracks.push({
          id_carrier: null,
          tracking_number: null,
          tracking_url: null
        });
      }
      
    }

    return { tracks };

  } catch (error) {
    console.log(error);
    throw error;
  }
}


// Recuperation de l'order selon la reference du client
async function getOrderByReferenceNum(apiUrl, reference) {
  const url = `${apiUrl}orders?filter[reference]=${reference}&output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  if(data.length == 0){
    return null;
  }else{
    return data.orders[0].id ?? null;
  }
}

//avoir les donnees avec les references digiparf:[UCMRBZIYS] - helfrich[OSAQVJDNX] - univercse[JTFRORPVM]
async function getOrderByReference(reference, apiUrl = apiUrlDigiparf, boutique = "Digiparf"){
  try {
    //verification de tout les boutiques
    let order_id = await getOrderByReferenceNum(apiUrl, reference);
    if(!order_id){
      switch (apiUrl) {
        case apiUrlDigiparf:
          // si on est sur digiparf -> helfrich
          return await getOrderByReference(reference, apiUrlHelfrich, "Helfrich");
        case apiUrlHelfrich:
          // si on est sur digiparf -> helfrich
          return await getOrderByReference(reference, apiUrlUniversce, "Universce");
        case apiUrlUniversce:
          // on a passe sur tout les boutiques (on a pas trouve la commande)
          throw new Error("Commande non trouvée ou erreur lors de la récupération");
      }
    }

    const order = await getOrderById(apiUrl, order_id);
    if (!order) throw new Error("Commande non trouvée ou erreur lors de la récupération");

    let customer = null;
    if (order.id_customer) {
      customer = await getCustomerById(apiUrl, order.id_customer);
      console.log(customer ? "Informations client récupérées !" : "Impossible de récupérer les infos client");
    }

    let orderState = null;
    if (order.current_state) {
      orderState = await getOrderStateById(apiUrl, order.current_state);
      console.log(orderState ? "Statut récupéré !" : "Impossible de récupérer le statut");
    }

    const orderDetails = await getOrderDetails(apiUrl, order_id);
    console.log(orderDetails.length > 0 ? `${orderDetails.length} produit(s) récupéré(s)` : "Aucun produit trouvé");

    const transaction_details = await getOrderPayement(apiUrl, reference);
    console.log(transaction_details ? "detail payment récupéré !" : "Impossible de récupérer le detail payment");

    const tracking = await getTracking(apiUrl, order_id);
    console.log(tracking ? "detail tracking récupéré !" : "Impossible de récupérer le detail payment");

    return {
      boutique,
      order,
      customer,
      orderState,
      orderDetails,
      transaction_details,
      tracking
    }
    
  } catch (err) {
    console.error("❌ Erreur:", err.message);
    throw err;
  }
}

// ------------------------------------------------------------------------------------------------- //
//        RECUPERATION DES COMMANDE EXPEDIER du mois dernier ET ENVOI MAIL vers la comptabiliter     //
// ------------------------------------------------------------------------------------------------- //
async function getOrderShippedWithClients(apiUrl, dateDebut, dateFin) {
  try {
    const params = new URLSearchParams({
      output_format: 'JSON',
      'filter[current_state]': 4, // expedie
      'filter[date_add]': `[${dateDebut},${dateFin}]`,
      date: 1,
      display: 'full',
    });

    const { orders = [] } = await callPrestaShopAPI(`${apiUrl}orders?${params}`);

    const clientsCache  = {};
    const adressesCache = {};
    const histoCache    = {};
    const paysCache     = {};    // ✅ Cache pays

    const results = await Promise.all(orders.map(async (order) => {

      const cid = order.id_customer;
      const aid = order.id_address_delivery;

      if (!clientsCache[cid]) {
        const clientData = await callPrestaShopAPI(`${apiUrl}customers/${cid}?output_format=JSON`);
        clientsCache[cid] = clientData.customer;
      }

      if (!adressesCache[aid]) {
        const adresseData = await callPrestaShopAPI(`${apiUrl}addresses/${aid}?output_format=JSON`);
        adressesCache[aid] = adresseData.address;
      }

      const adresse   = adressesCache[aid];

      // ✅ Résolution du pays via id_country (avec cache)
      const idPays = adresse.id_country;
      if (!paysCache[idPays]) {
        const paysData = await callPrestaShopAPI(
          `${apiUrl}countries/${idPays}?output_format=JSON`
        );
        paysCache[idPays] = paysData.country.name;
      }

      if (!histoCache[cid]) {
        const histoParams = new URLSearchParams({
          output_format: 'JSON',
          'filter[id_customer]': cid,
          display: 'full',
        });
        const { orders: toutesCommandes = [] } = await callPrestaShopAPI(
          `${apiUrl}orders?${histoParams}`
        );
        const triees = toutesCommandes.sort(
          (a, b) => new Date(a.date_add) - new Date(b.date_add)
        );
        histoCache[cid] = {
          est_nouveau:        toutesCommandes.length === 1,
          statut:             toutesCommandes.length === 1 ? 'OUI' : 'NON',
          nb_commandes_total: toutesCommandes.length,
          premiere_commande:  triees[0]?.date_add,
          total_cumule:       toutesCommandes
                                .reduce((sum, o) => sum + parseFloat(o.total_paid), 0)
                                .toFixed(2) + ' €',
        };
      }

      const client  = clientsCache[cid];
      const histo   = histoCache[cid];

      return {
        commande: {
          id:        order.id,
          date:      order.date_add,
          total:     order.total_paid,
          reference: order.reference,
          paiement:  order.payment,
        },
        client: {
          prenom:    client.firstname,
          nom:       client.lastname,
          email:     client.email,
          telephone: adresse.phone || adresse.phone_mobile,
        },
        adresse_livraison: {
          ligne1:      adresse.address1,
          ligne2:      adresse.address2 || '',
          code_postal: adresse.postcode,
          ville:       adresse.city,
          pays:        paysCache[idPays],    // ✅ Nom du pays résolu
        },
        historique: {
          statut:             histo.statut,
          est_nouveau:        histo.est_nouveau,
          nb_commandes_total: histo.nb_commandes_total,
          premiere_commande:  histo.premiere_commande,
          total_cumule:       histo.total_cumule,
        },
      };
    }));

    return results;

  } catch (err) {
    console.error("❌ Erreur:", err.message);
    throw err;
  }
}

/**
 * Génère un fichier Excel pour un store PrestaShop
 * @param {string} storeName  - Nom du store (ex: "Helfrich")
 * @param {string} dateDebut  - Date début   (ex: "2024-01-01")
 * @param {string} dateFin    - Date fin      (ex: "2024-01-31")
 * @param {Array}  rows       - Tableau de commandes formatées
 * @param {string} outputDir  - Dossier de sortie (défaut: "./exports")
 * @returns {string}          - Chemin du fichier généré
 */
function generateOrderExcel(storeName, dateDebut, dateFin, rows, outputDir = './exports') {
 
  // ── Workbook ───────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
 
  // ── En-têtes colonnes ──────────────────────────────────────────────────────
  const HEADERS = ['ID', 'Référence', 'Nouveau client', 'Livraison', 'Client', 'Total', 'Paiement', 'État', 'Date'];
 
  // Ligne titre (fusionnée via merge)
  // const titleRow = [`Commandes expédiées — ${storeName}   (${dateDebut}  →  ${dateFin})`];
 
  // Lignes de données
  const dataRows = rows.map(o => [
    o['ID'],
    o['Référence'],
    o['Nouveau client'],
    o['Livraison'],
    o['Client'],
    o['Total'],
    o['Paiement'],
    o['État'],
    o['Date'],
  ]);
 
  // Ligne résumé
  // const nbNouveau  = rows.filter(r => r['Nouveau client'] === 'Nouveau').length;
  // const nbExistant = rows.length - nbNouveau;
  // const summaryRow = [
  //   `${rows.length} commande(s)`, '', `Nouveau: ${nbNouveau}  /  Existant: ${nbExistant}`,
  // ];
 
  // Assemblage : [titre, en-têtes, ...données, vide, résumé]
  //const allRows = [titleRow, HEADERS, ...dataRows, [], summaryRow];
  const allRows = [HEADERS, ...dataRows, []];
 
  // ── Worksheet ──────────────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(allRows);
 
  // ── Fusion cellules titre (A1:I1) ──────────────────────────────────────────
  // ws['!merges'] = [
  //   { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
  // ];
 
  // ── Largeurs colonnes ──────────────────────────────────────────────────────
  ws['!cols'] = [
    { wch: 8  },   // ID
    { wch: 18 },   // Référence
    { wch: 16 },   // Nouveau client
    { wch: 45 },   // Livraison
    { wch: 25 },   // Client
    { wch: 13 },   // Total
    { wch: 18 },   // Paiement
    { wch: 12 },   // État
    { wch: 22 },   // Date
  ];
 
  // ── Hauteurs lignes ────────────────────────────────────────────────────────
  ws['!rows'] = [
    //{ hpt: 32 },   // Titre
    { hpt: 22 },   // En-têtes
    ...rows.map(() => ({ hpt: 18 })),
  ];
 
  // ── Figer les 2 premières lignes ───────────────────────────────────────────
  ws['!freeze'] = { xSplit: 0, ySplit: 2 };
 
  // ── Helper style bordure ───────────────────────────────────────────────────
  const border = {
    top:    { style: 'thin', color: { rgb: 'DEE2E6' } },
    bottom: { style: 'thin', color: { rgb: 'DEE2E6' } },
    left:   { style: 'thin', color: { rgb: 'DEE2E6' } },
    right:  { style: 'thin', color: { rgb: 'DEE2E6' } },
  };
 
  // ── Style : Titre ──────────────────────────────────────────────────────────
  // ws['A1'].s = {
  //   font:      { name: 'Arial', sz: 13, bold: true, color: { rgb: '000000' } },
  //   alignment: { horizontal: 'center', vertical: 'center' },
  // };
 
  // ── Style : En-têtes (ligne 2, r=1) ───────────────────────────────────────
  HEADERS.forEach((_, c) => {
    const ref = XLSX.utils.encode_cell({ r: 1, c });
    ws[ref].s = {
      font:      { name: 'Arial', sz: 10, bold: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border,
    };
  });
 
  // ── Style : Données (r=2 → r=2+rows.length-1) ─────────────────────────────
  rows.forEach((order, rowIdx) => {
    const isNouveau = order['Nouveau client'] === 'OUI';
    const isAlt     = rowIdx % 2 === 1;
    const r         = rowIdx + 2;
 
    HEADERS.forEach((_, c) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 'z', v: '' };
 
      if (c === 2) {
        // Colonne "Nouveau client" → colorée selon statut
        ws[ref].s = {
          font:      { name: 'Arial', sz: 10, bold: true,
                       color: { rgb: isNouveau ? '155724' : '856404' } },
          fill:      { fgColor: { rgb: isNouveau ? 'D4EDDA' : 'FFF3CD' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border,
        };
      } else {
        ws[ref].s = {
          font:      { name: 'Arial', sz: 10 },
          fill:      isAlt ? { fgColor: { rgb: 'F8F9FA' } } : {},
          alignment: { vertical: 'center', wrapText: c === 3 },
          border,
        };
      }
    });
  });
 
  // ── Style : Résumé ─────────────────────────────────────────────────────────
  // const summaryR = rows.length + 3;   // titre(1) + en-têtes(1) + données + vide(1)
  // ['A', 'C'].forEach(col => {
  //   const ref = `${col}${summaryR}`;
  //   if (ws[ref]) ws[ref].s = { font: { name: 'Arial', sz: 10, bold: true } };
  // });
 
  // ── Ajout feuille ──────────────────────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, ws, `Commandes ${storeName}`);
 
  // ── Sauvegarde ─────────────────────────────────────────────────────────────
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
 
  const filename = `commandes_${storeName}_${dateDebut}_${dateFin}.xlsx`;
  const filepath = path.join(outputDir, filename);
 
  XLSX.writeFile(wb, filepath, { bookType: 'xlsx', cellStyles: true });
 
  return filepath;
}

// ── Intégration dans getOrderRepport ──────────────────────────────────────────
async function extractOrderDigiparfRepport(dateDebutMoisDernier, dateDebutMoisActuel) {

  const debutMoisActuel = new Date(dateDebutMoisActuel);
  const dateFinMoisDernier = new Date(debutMoisActuel - 1).toISOString().split('T')[0]; 

  const stores = [
    { name: 'Helfrich',    api: apiUrlHelfrich    },
    { name: 'Universce',   api: apiUrlUniversce   },
    { name: 'Ambitioncse', api: apiUrlAmbitioncse },
    { name: 'Clubulys',    api: apiUrlClubulys    },
    { name: 'Reducce',     api: apiUrlReducce     },
  ];
 
  toRecipients = [process.env.ACCOUNTANT_EMAIL, process.env.ACCOUNTANT_EMAIL2, process.env.JULIENNOYER_EMAIL, process.env.SUPERVISOR_EMAIL]; 
  subject = `Commande expédiée ${dateDebutMoisDernier} - ${dateFinMoisDernier}`;
  bodyHtml = `<html>
                  <p>Bonjour,</p>
                  <p>
                      Veuillez trouver ci-joint le récapitulatif des commandes expédiées 
                      pour chaque boutique sur la période du ${dateDebutMoisDernier} au ${dateFinMoisDernier}.
                  </p>
                  <p>
                      Restant à votre disposition pour toute information complémentaire.
                  </p>
                  <p>Bien cordialement</p>
              </html>`; 
  attachments = [];

  for (const store of stores) {
    console.log(`\n Traitement de ${store.name}...`);
 
    const orders = await getOrderShippedWithClients(store.api, dateDebutMoisDernier, dateDebutMoisActuel);
 
    if (orders.length === 0) {
      console.log(`⚠️  Aucune commande expédiée pour ${store.name}`);
      continue;
    }
 
    // Formater les données pour l'Excel
    const rows = orders.map(o => ({
      'ID':             o.commande.id,
      'Référence':      o.commande.reference,
      'Nouveau client': o.historique.statut,          // "OUI" ou "NON"
      'Livraison':      [
                          o.adresse_livraison.ligne1,
                          o.adresse_livraison.ligne2,
                          `${o.adresse_livraison.code_postal} ${o.adresse_livraison.ville}`,
                          o.adresse_livraison.pays,
                        ].filter(Boolean).join(', '),
      'Client':         `${o.client.prenom} ${o.client.nom}`,
      'Total':          parseFloat(o.commande.total).toFixed(2) + ' €',
      'Paiement':       o.commande.paiement,
      'État':           'Expédié',
      'Date':           o.commande.date,
    }));
 
    const filepath = await generateOrderExcel(store.name, dateDebutMoisDernier, dateFinMoisDernier, rows, 'executable/export');

    attachments.push({
      filename:      path.basename(filepath),
      mimeType:      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contentBase64: fs.readFileSync(filepath).toString('base64'),
    });

    await fs.rmSync(filepath);
 
    console.log(`  ✅ ${filepath} — ${rows.length} commande(s)`);
  }

  // envoie de l'email
  OutlookDigiparfApiService.sendMailUtils(toRecipients, subject, bodyHtml, attachments);

}

module.exports = { getOrderByReference, extractOrderDigiparfRepport };