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
const landmarkRoutes = require('./routes/external/landmarkRoutes');
const tntRoutes = require('./routes/external/tntRoutes');
const outlookRoutes = require('./routes/external/outlookRoutes');
const openaiRoutes = require('./routes/external/openaiRoutes');
const shippingboRoutes = require('./routes/external/shippingboRoutes');

const authRoutes = require('./routes/backoffice/authRoutes');
const userRoutes = require('./routes/backoffice/userRoutes');
const projectRoutes = require('./routes/backoffice/projectRoutes');
const ticketRoutes = require('./routes/backoffice/ticketRoutes');
const ticketRoutes2 = require('./routes/backoffice/ticket2Routes');

const app = express();
const port = process.env.PORT;

// Apply this to all routes
app.use(watchguard);

// Middleware
app.use(cors());
app.use(express.json());

// Transporteur 
app.use('/colissimo', colissimoRoutes);
app.use('/modialrelay', modialrelayRoutes);
app.use('/tnt', tntRoutes);
app.use('/landmark', landmarkRoutes);
app.use('/shippingbo', shippingboRoutes);

// boutique et ressource
app.use('/shopify', shopifyRoutes);
app.use('/magento', magentoRoutes);
app.use('/prestashop', prestashopRoutes);
app.use('/outlook', outlookRoutes);

// IA ressource
app.use('/openai', openaiRoutes);

// Api
app.use('/auth', authRoutes);
app.use('/user', authenticateToken, userRoutes);
app.use('/project', authenticateToken, projectRoutes);
app.use('/ticket', authenticateToken, ticketRoutes);
app.use('/ticket2', ticketRoutes2);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});