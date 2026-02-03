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

    let result = {
      "order_id": order.entity_id,
      "increment_id": order.increment_id,
      "created_at": order.created_at,
      "status": order.status,
      "currency": order.order_currency_code,
      "totals": {
        "subtotal_ht": order.subtotal_invoiced,
        "tax": order.tax_invoiced,
        "shipping": order.shipping_amount,
        "discount": order.discount_invoiced,
        "grand_total_ttc": order.total_invoiced
      },
      "customer": {
        "id": order.customer_id,
        "firstname": order.billing_address.firstname,
        "lastname": order.billing_address.lastname,
        "email": order.billing_address.email,
        "is_guest": false
      },
      "billing_address": {
        "firstname": order.billing_address.firstname,
        "lastname": order.billing_address.lastname,
        "street": order.billing_address.street,
        "city": order.billing_address.city,
        "postcode": order.billing_address.postcode,
        "country": order.billing_address.country_id,
        "telephone": order.billing_address.telephone
      },
      "shipping_address": {
        "firstname": order.billing_address.firstname,
        "lastname": order.billing_address.lastname,
        "street": order.extension_attributes.shipping_assignments[0].shipping.address.street,
        "city": order.extension_attributes.shipping_assignments[0].shipping.address.city,
        "postcode": order.extension_attributes.shipping_assignments[0].shipping.address.postcode,
        "country": order.extension_attributes.shipping_assignments[0].shipping.address.country_id,
        "telephone": order.extension_attributes.shipping_assignments[0].shipping.address.telephone,
        "method": order.extension_attributes.shipping_assignments[0].shipping.method
      },
      "payment": {
        "method": order.payment.method,
        "type": order.payment.cc_type,
        "amount_paid": order.payment.base_amount_paid1,
        "status": order.payment.cc_status_description,
        "transaction_id": order.payment.last_trans_id
      },
      "invoice": invoices[0].items,
      "items": [
        {
          "sku": "3348901637602",
          "name": "Dior - Dior Forever Skin Correct (3 CR Cool Rosy)",
          "qty": 1,
          "price_ht": 19.31,
          "price_ttc": 23.17,
          "tax_percent": 20
        },
        {
          "sku": "3331841141261",
          "name": "IKKS - For a Kiss - Eau de Toilette 50 ml",
          "qty": 1,
          "price_ht": 23.71,
          "price_ttc": 28.45,
          "tax_percent": 20
        }
      ]
    }

    return {
      result
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