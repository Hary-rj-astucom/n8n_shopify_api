const express = require('express');
const landmarkController = require('../../controllers/external/LandmarkController');

const router = express.Router();

//Shopify format
router.post('/track', landmarkController.trackpackage);

module.exports = router;