require('dotenv').config();
const axios = require('axios');

const prestashopApi  = axios.create({
  baseURL: `${ process.env.PRESTASHOP_URL }/api`,
  auth: {
    username: process.env.PRESTASHOP_API_KEY,
    password: '' // doit rester vide pour PrestaShop
  },
  headers: { 'Output-Format': 'JSON' }
});

/**
 * Récupère une commande et ses transactions via le numéro visible par le client
 * @param {string} referenceNum - Numéro de commande visible par le client
 */
async function getOrderByReference(referenceNum) {
  try {
    // 1. Récupération de la commande avec le filtre sur reference
    const orderResponse = await prestashopApi.get(`/orders?filter[reference]=${referenceNum}`);
    const orders = orderResponse.data.orders || [];

    if (orders.length === 0) {
      return null; // pas de commande trouvée
    }

    const order = orders[0];

    // 2. Récupération des transactions pour cette commande
    const transactionResponse = await prestashopApi.get(`/order_payments?filter[id_order]=${order.id}`);
    const transactions = transactionResponse.data.order_payments || [];

    return {
      order,
      transactions
    };

  } catch (error) {
    console.error('Erreur lors de la récupération de la commande :', error.message);
    return error;
  }
}

module.exports = { getOrderByReference };