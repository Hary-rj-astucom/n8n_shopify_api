require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

    return {
      order
    };

  } catch (error) {
    console.error('Erreur_Magento:', error.response?.data || error.message);
    throw error;
  }
}

//Invoice data

async function getOrderWithInvoiceByNumber(orderNumber) {
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

    // 2. Récupérer les factures liées via order_id
    const invoiceSearch =
      `searchCriteria[filter_groups][0][filters][0][field]=order_id` +
      `&searchCriteria[filter_groups][0][filters][0][value]=${order.entity_id}` +
      `&searchCriteria[filter_groups][0][filters][0][condition_type]=eq`;

    const invoiceResponse = await magento.get(`/invoices?${invoiceSearch}`);

    const invoices = invoiceResponse.data.items || [];

    return {
      order,
      invoices
    };

  } catch (error) {
    console.error('Erreur_Magento:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { 
  getOrderWithTransactionsByNumber, 
  getOrderWithInvoiceByNumber
};