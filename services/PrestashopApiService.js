require('dotenv').config();
const axios = require('axios');

// Configuration de l'API PrestaShop
// const apiKey = "EYY3MPK7IK2M59SANQYCLDU7E1F2XFXA";
// const shopUrl = "https://www.digiparf.com"; // Remplacez par votre URL

const apiKey = process.env.PRESTASHOP_API_KEY;
const shopUrl = process.env.PRESTASHOP_URL;

const apiUrl = `${shopUrl}/api/`;

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
async function getOrderById(order_id) {
  const url = `${apiUrl}orders/${order_id}?output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.order ?? null;
}

// Récupérer un client par ID
async function getCustomerById(customerId) {
  const url = `${apiUrl}customers/${customerId}?output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.customer ?? null;
}

// Récupérer un statut de commande
async function getOrderStateById(stateId) {
  const url = `${apiUrl}order_states/${stateId}?output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.order_state ?? null;
}

// Récupérer les produits d’une commande
async function getOrderDetails(order_id) {
  const url = `${apiUrl}order_details?filter[id_order]=${order_id}&output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.order_details ?? [];
}

//avoir les donnees avec les references
async function getOrderByReference(order_id){
  try {
    const order = await getOrderById(order_id);
    if (!order) throw new Error("Commande non trouvée ou erreur lors de la récupération");

    let customer = null;
    if (order.id_customer) {
      customer = await getCustomerById(order.id_customer);
      console.log(customer ? "✓ Informations client récupérées !" : "⚠️ Impossible de récupérer les infos client");
    }

    let orderState = null;
    if (order.current_state) {
      orderState = await getOrderStateById(order.current_state);
      console.log(orderState ? "✓ Statut récupéré !" : "⚠️ Impossible de récupérer le statut");
    }

    const orderDetails = await getOrderDetails(order_id);
    console.log(orderDetails.length > 0 ? `✓ ${orderDetails.length} produit(s) récupéré(s)` : "⚠️ Aucun produit trouvé");

    return {
      order,
      customer,
      orderState,
      orderDetails
    }
    
  } catch (err) {
    console.error("❌ Erreur:", err.message);
  }
}

module.exports = { getOrderByReference };