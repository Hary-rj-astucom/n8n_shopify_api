require('dotenv').config();

const express = require('express');
const cors = require('cors');
const watchguard = require('./middleware/watchGuard');
const shopifyRoutes = require('./routes/shopifyRoutes');
const magentoRoutes = require('./routes/magentoRoutes');
const prestashopRoutes = require('./routes/prestashopRoutes');
const colissimoRoutes = require('./routes/colissimoRoutes');
const modialrelayRoutes = require('./routes/modialrelayRoutes');

const app = express();
const port = process.env.PORT;

// Apply this to all routes
app.use(watchguard);

// Middleware
app.use(cors());
app.use(express.json());

// Routes

app.use('/colissimo', colissimoRoutes);
app.use('/modialrelay', modialrelayRoutes);
app.use('/shopify', shopifyRoutes);
app.use('/magento', magentoRoutes);
app.use('/prestashop', prestashopRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});