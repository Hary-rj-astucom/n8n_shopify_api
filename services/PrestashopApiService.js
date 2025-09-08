require('dotenv').config();
const axios = require('axios');

// Configuration de l'API PrestaShop
// const apiKey = "EYY3MPK7IK2M59SANQYCLDU7E1F2XFXA";
// const shopUrl = "https://www.digiparf.com"; // Remplacez par votre URL

const apiKey = process.env.PRESTASHOP_API_KEY;
const shopUrl = process.env.PRESTASHOP_URL;

const shopUrlDigiparf = process.env.PRESTASHOP_DIGIPARF_URL;
const shopUrlHelfrich = process.env.PRESTASHOP_HELFRICH_URL;
const shopUrlUniverscse = process.env.PRESTASHOP_UNIVERSCSE_URL;

const apiUrlDigiparf = `${shopUrlDigiparf}/api/`;
const apiUrlHelfrich = `${shopUrlHelfrich}/api/`;
const apiUrlUniversce = `${shopUrlUniverscse}/api/`;

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
  if(data.order_payments.length > 0){
    for(let a=0; a<data.order_payments.length; a++){
      result.push(await getOrderPayementDetail(apiUrl, data.order_payments[0].id)); 
    }
    return result;    
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
      console.log(customer ? "✓ Informations client récupérées !" : "⚠️ Impossible de récupérer les infos client");
    }

    let orderState = null;
    if (order.current_state) {
      orderState = await getOrderStateById(apiUrl, order.current_state);
      console.log(orderState ? "✓ Statut récupéré !" : "⚠️ Impossible de récupérer le statut");
    }

    const orderDetails = await getOrderDetails(apiUrl, order_id);
    console.log(orderDetails.length > 0 ? `✓ ${orderDetails.length} produit(s) récupéré(s)` : "⚠️ Aucun produit trouvé");

    const transaction_details = await getOrderPayement(apiUrl, reference);
    console.log(transaction_details ? "✓ detail payment récupéré !" : "⚠️ Impossible de récupérer le detail payment");

    return {
      boutique,
      order,
      customer,
      orderState,
      orderDetails,
      transaction_details
    }
    
  } catch (err) {
    console.error("❌ Erreur:", err.message);
    throw err;
  }
}

module.exports = { getOrderByReference };