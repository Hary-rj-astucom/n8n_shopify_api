const express = require('express');
const colissimoController = require('../controllers/ColissimoController');

const router = express.Router();

//Shopify format
router.post('/trackOrder', colissimoController.trackOrder);

module.exports = router;