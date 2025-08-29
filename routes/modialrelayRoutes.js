const express = require('express');
const mondialRelayController = require('../controllers/MondialRelayController');

const router = express.Router();

//Shopify format
router.post('/trackPackageByNum', mondialRelayController.trackPackageByNum);

module.exports = router;