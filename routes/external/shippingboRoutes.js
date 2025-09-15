const express = require('express');
const shippingboController = require('../../controllers/external/ShippingboController');

const router = express.Router();

//Shopify format
router.post('/showorder', shippingboController.showOrder);
router.post('/showorderbyoriginref', shippingboController.showOrderByOriginRef);
router.get('/callback', shippingboController.callback);

module.exports = router;