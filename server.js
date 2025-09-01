import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

// external ressource
import watchguard from './middleware/watchGuard.js';
import shopifyRoutes from './routes/external/shopifyRoutes.js';
import magentoRoutes from './routes/external/magentoRoutes.js';
import prestashopRoutes from './routes/external/prestashopRoutes.js';
import colissimoRoutes from './routes/external/colissimoRoutes.js';
import modialrelayRoutes from './routes/external/modialrelayRoutes.js';

// internal ressource
import userRoutes from "./routes/backoffice/userRoutes.js";

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
app.use('/user', userRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});