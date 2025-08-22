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
      name: `#${orderNumber}`
    });

    if (orders.length === 0) {
      console.log(`No order found with order_number: ${orderNumber}`);
      return null;
    }

    // get transaction list
    const transactions = await shopify.transaction.list(orders[0].id);
    let order = orders[0];
    order.transactions = transactions;

    return order;

  } catch (error) {
    console.error('Error fetching order:', error);
  }
}

module.exports = { 
  getOrderByOrderNumber
};