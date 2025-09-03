require('dotenv').config();
const axios = require('axios');

const magento = axios.create({
  baseURL: `${process.env.MAGENTO_URL}/rest/V1`,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.MAGENTO_ACCESS_TOKEN}` // Utiliser un token admin ou integration
  }
});

async function getOrderWithTransactionsByNumber(orderNumber) {
  try {

    // 1. Rechercher la commande via increment_id
    const searchCriteria = `searchCriteria[filter_groups][0][filters][0][field]=increment_id` +
      `&searchCriteria[filter_groups][0][filters][0][value]=${orderNumber}` +
      `&searchCriteria[filter_groups][0][filters][0][condition_type]=eq`;

    const orderResponse = await magento.get(`/orders?${searchCriteria}`);

    if (!orderResponse.data.items || orderResponse.data.items.length === 0) {
      throw new Error(`Commande ${orderNumber} introuvable`);
    }

    const order = orderResponse.data.items[0];
    const orderId = order.entity_id;

    console.dir(order);

    // 2. Récupérer les transactions financières
    const transactionResponse = await magento.get(`/orders/${orderId}/transactions`);

    return {
      order,
      transactions: transactionResponse.data
    };
  } catch (error) {
    console.error('Erreur_Magento:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { getOrderWithTransactionsByNumber };