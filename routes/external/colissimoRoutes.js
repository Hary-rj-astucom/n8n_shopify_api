const express = require('express');
const colissimoController = require('../../controllers/external/ColissimoController');

const router = express.Router();

//Shopify format
router.post('/trackOrder', colissimoController.trackOrder);

module.exports = router;