require('dotenv').config();
const dayjs = require('dayjs');
const axios = require('axios');
const { replaceWords, roundToNthDecimal, createCustomLogger } = require('../utils/tools');
const MagentoService = require('../services/MagentoService');

// Config Shopify
const SHOPIFY_STORE = process.env.SHOPIFY_SHOP_NAME;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

//----------------------------------------------//
//        start Update price + stock            //
//----------------------------------------------//

// Trouver la variante par barcode
async function findVariantByBarcode(barcode) {
  const query = `
    {
      productVariants(first: 1, query: "barcode:${barcode}") {
        edges {
          node {
            id
            price
            inventoryItem {
              id
            }
          }
        }
      }
    }
  `;

  const res = await axios.post(
    `https://${SHOPIFY_STORE}/admin/api/2024-01/graphql.json`,
    { query },
    {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    }
  );

  return res.data.data.productVariants.edges[0]?.node;
}

//--------------------------------------------//
//        fin Update price + stock            //
//--------------------------------------------//




module.exports = { 
  updateStockPriceAllList,
  updateProductByBarcode,
  startUpdatePriceList
};