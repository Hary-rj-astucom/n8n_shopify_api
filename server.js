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
app.use('/n8n_cosmia/colissimo', colissimoRoutes);
app.use('/n8n_cosmia/modialrelay', modialrelayRoutes);
app.use('/n8n_cosmia/tnt', tntRoutes);
app.use('/n8n_cosmia/landmark', landmarkRoutes);
app.use('/n8n_cosmia/shippingbo', shippingboRoutes);

// boutique et ressource
app.use('/n8n_cosmia/shopify', shopifyRoutes);
app.use('/n8n_cosmia/magento', magentoRoutes);
app.use('/n8n_cosmia/prestashop', prestashopRoutes);
app.use('/n8n_cosmia/outlook', outlookRoutes);

// IA ressource
app.use('/n8n_cosmia/openai', openaiRoutes);

// Api
app.use('/n8n_cosmia/auth', authRoutes);
app.use('/n8n_cosmia/user', authenticateToken, userRoutes);
app.use('/n8n_cosmia/project', authenticateToken, projectRoutes);
app.use('/n8n_cosmia/ticket', authenticateToken, ticketRoutes);
app.use('/n8n_cosmia/ticket2', ticketRoutes2);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
