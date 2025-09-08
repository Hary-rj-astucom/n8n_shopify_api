const express = require('express');
const tntController = require('../../controllers/external/TntController');

const router = express.Router();

//Shopify format
router.post('/track', tntController.trackpackage);

module.exports = router;