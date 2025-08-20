require('dotenv').config();
const Shopify = require('shopify-api-node');

// Config Shopify
const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP_NAME,     // e.g. my-store
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN
});

async function getOrderByOrderNumber(orderNumber) {
  try {
    // Search orders using order_number
    const orders = await shopify.order.list({
      status: 'any', // include open, closed, cancelled
      limit: 1,
      order_number: orderNumber // ⚠️ Shopify REST API does NOT allow direct filter by order_number
    });

    if (orders.length === 0) {
      console.log(`No order found with order_number: ${orderNumber}`);
      return null;
    }

    return orders[0];
  } catch (error) {
    console.error('Error fetching order:', error);
  }
}

module.exports = { 
  getOrderByOrderNumber
};