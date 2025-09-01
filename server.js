require('dotenv').config();

const express = require('express');
const cors = require('cors');

// module import
const watchguard = require('./middleware/watchGuard');
const authenticateToken = require("./middleware/authenticateToken.js");

const shopifyRoutes = require('./routes/external/shopifyRoutes');
const magentoRoutes = require('./routes/external/magentoRoutes');
const prestashopRoutes = require('./routes/external/prestashopRoutes');
const colissimoRoutes = require('./routes/external/colissimoRoutes');
const modialrelayRoutes = require('./routes/external/modialrelayRoutes');

const authRoutes = require('./routes/backoffice/authRoutes');
const userRoutes = require('./routes/backoffice/userRoutes');
const projectRoutes = require('./routes/backoffice/projectRoutes');

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

// Api
app.use('/auth', authRoutes);
app.use('/user', authenticateToken, userRoutes);
app.use('/project', authenticateToken, projectRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});