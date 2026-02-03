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
function cleanMagentoOrder(order) {
  // Remove empty values
  const clean = (obj) => {
    if (Array.isArray(obj)) {
      return obj
        .map(clean)
        .filter(v => v !== null && v !== "" && v !== "[]" && v !== undefined);
    }

    if (typeof obj === "object" && obj !== null) {
      const cleaned = {};
      for (const key in obj) {
        const val = clean(obj[key]);
        if (
          val === null ||
          val === "" ||
          val === "[]" ||
          val === undefined ||
          (Array.isArray(val) && val.length === 0)
        ) continue;
        cleaned[key] = val;
      }
      return cleaned;
    }

    return obj;
  };

  const o = clean(order);

  // ------------------------------------------
  // 1️⃣ Regrouper items configurable + simple
  // ------------------------------------------
  const parentItems = {};
  const childItems = {};

  o.items?.forEach(item => {
    if (!item.parent_item_id) {
      parentItems[item.item_id] = {
        product_id: item.product_id,
        sku: item.sku,
        name: item.name,
        qty: item.qty_ordered,
        price: item.price_incl_tax,
        tax: item.tax_amount,
        total: item.row_total_incl_tax,
        children: []
      };
    } else {
      childItems[item.item_id] = item;
    }
  });

  Object.values(childItems).forEach(item => {
    const parentId = item.parent_item_id;
    if (parentItems[parentId]) {
      parentItems[parentId].children.push({
        product_id: item.product_id,
        sku: item.sku,
        name: item.name
      });
    }
  });

  const items = Object.values(parentItems);

  // ------------------------------------------
  // 2️⃣ Billing / Shipping
  // ------------------------------------------
  const billing = o.billing_address ? {
    firstname: o.billing_address.firstname,
    lastname: o.billing_address.lastname,
    street: o.billing_address.street,
    city: o.billing_address.city,
    postcode: o.billing_address.postcode,
    country_id: o.billing_address.country_id,
    telephone: o.billing_address.telephone
  } : null;

  const shippingRaw =
    o.extension_attributes?.shipping_assignments?.[0]?.shipping?.address;

  const shipping = shippingRaw ? {
    firstname: shippingRaw.firstname,
    lastname: shippingRaw.lastname,
    street: shippingRaw.street,
    city: shippingRaw.city,
    postcode: shippingRaw.postcode,
    country_id: shippingRaw.country_id,
    telephone: shippingRaw.telephone
  } : null;

  // ------------------------------------------
  // 3️⃣ Paiement
  // ------------------------------------------
  const payment = o.payment ? {
    method: o.payment.method,
    cc_type: o.payment.cc_type,
    amount_paid: o.payment.amount_paid
  } : null;

  // ------------------------------------------
  // 4️⃣ Historique
  // ------------------------------------------
  const history = (o.status_histories || []).map(h => ({
    status: h.status,
    message: h.comment,
    date: h.created_at
  }));

  // ------------------------------------------
  // 5️⃣ INVOICES (factures)
  // ------------------------------------------
  const invoices = (o.extension_attributes?.invoice || []).map(inv => ({
    invoice_id: inv.entity_id,
    invoice_number: inv.increment_id,
    created_at: inv.created_at,
    subtotal: inv.subtotal_incl_tax,
    tax: inv.tax_amount,
    shipping: inv.shipping_incl_tax,
    grand_total: inv.grand_total,
    items: (inv.items || []).map(i => ({
      sku: i.sku,
      name: i.name,
      qty: i.qty,
      price: i.price_incl_tax,
      row_total: i.row_total_incl_tax
    }))
  }));

  // ------------------------------------------
  // 6️⃣ Résultat final complet + invoices
  // ------------------------------------------
  return {
    order_id: o.entity_id,
    increment_id: o.increment_id,
    created_at: o.created_at,
    status: o.status,
    customer: {
      id: o.customer_id,
      email: o.customer_email,
      firstname: o.customer_firstname,
      lastname: o.customer_lastname
    },
    billing_address: billing,
    shipping_address: shipping,
    totals: {
      subtotal: o.subtotal_incl_tax,
      tax: o.tax_amount,
      shipping: o.shipping_amount,
      grand_total: o.grand_total
    },
    payment,
    items,
    invoices,
    history
  };
}

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

    // creer le resultat
    const result = cleanMagentoOrder({
      order,
      invoices
    });

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