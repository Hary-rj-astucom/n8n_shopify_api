require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// module import
const watchguard = require('./middleware/watchGuard');
const authenticateToken = require("./middleware/authenticateToken.js");

const shopifyRoutes = require('./routes/external/shopifyRoutes');
const magentoRoutes = require('./routes/external/magentoRoutes');
const prestashopRoutes = require('./routes/external/prestashopRoutes');
const prestashopKalistaRoutes = require('./routes/external/prestashopKalistaRoutes');
const prestashopLplcRoutes = require('./routes/external/prestashopLplcRoutes');
const colissimoRoutes = require('./routes/external/colissimoRoutes');
const modialrelayRoutes = require('./routes/external/modialrelayRoutes');
const landmarkRoutes = require('./routes/external/landmarkRoutes');
const tntRoutes = require('./routes/external/tntRoutes');
const outlookRoutes = require('./routes/external/outlookRoutes');
const openaiRoutes = require('./routes/external/openaiRoutes');
const shippingboRoutes = require('./routes/external/shippingboRoutes');
const gmailRoutes = require('./routes/external/gmailRoutes');

const authRoutes = require('./routes/backoffice/authRoutes');
const auth2Routes = require('./routes/backoffice/auth2Routes');
const userRoutes = require('./routes/backoffice/userRoutes');
const projectRoutes = require('./routes/backoffice/projectRoutes');
const ticketRoutes = require('./routes/backoffice/ticketRoutes');
const ticketRoutes2 = require('./routes/backoffice/ticket2Routes');
const dashRoutes = require('./routes/backoffice/dashRoutes');
const chatbotRoutes = require('./routes/backoffice/chatbotRoutes');

const app = express();
const port = process.env.PORT;

// playload limit
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Apply this to all routes
app.use(watchguard);

// Middleware
app.use(cors());
app.use(express.json());

// prefixe
const prefix = "/n8n_cosmia";

// Transporteur 
app.use(prefix + '/colissimo', colissimoRoutes);
app.use(prefix + '/modialrelay', modialrelayRoutes);
app.use(prefix + '/tnt', tntRoutes);
app.use(prefix + '/landmark', landmarkRoutes);
app.use(prefix + '/shippingbo', shippingboRoutes);

// boutique et ressource
app.use(prefix + '/shopify', shopifyRoutes);
app.use(prefix + '/magento', magentoRoutes);
app.use(prefix + '/prestashop', prestashopRoutes);
app.use(prefix + '/kalista', prestashopKalistaRoutes);
app.use(prefix + '/lplc', prestashopLplcRoutes);
app.use(prefix + '/outlook', outlookRoutes);
app.use(prefix + '/gmail', gmailRoutes);

// IA ressource
app.use(prefix + '/openai', openaiRoutes);

// Api
app.use(prefix + '/auth', authRoutes);
app.use(prefix + '/auth2', authenticateToken, auth2Routes);
app.use(prefix + '/user', authenticateToken, userRoutes);
app.use(prefix + '/project', authenticateToken, projectRoutes);
app.use(prefix + '/ticket', authenticateToken, ticketRoutes);
app.use(prefix + '/dash', authenticateToken, dashRoutes);
app.use(prefix + '/chatbot', authenticateToken, chatbotRoutes);
app.use(prefix + '/ticket2', ticketRoutes2);

// Serve everything inside "uploads" under /n8n_cosmia/public/uploads
app.use(prefix + '/public/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
