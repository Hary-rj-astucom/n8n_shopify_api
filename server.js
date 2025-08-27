require('dotenv').config();

const express = require('express');
const cors = require('cors');
const watchguard = require('./middleware/watchGuard');
const shopifyRoutes = require('./routes/shopifyRoutes');
const magentoRoutes = require('./routes/magentoRoutes');
const colissimoRoutes = require('./routes/colissimoRoutes');

const app = express();
const port = process.env.PORT;

// Apply this to all routes
app.use(watchguard);

// Middleware
app.use(cors());
app.use(express.json());

// Routes

app.use('/colissimo', colissimoRoutes);
app.use('/shopify', shopifyRoutes);
app.use('/magento', magentoRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});