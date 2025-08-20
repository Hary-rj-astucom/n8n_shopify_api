require('dotenv').config();

const express = require('express');
const cors = require('cors');
const watchguard = require('./middleware/watchGuard');
const shopifyRoutes = require('./routes/shopifyRoutes');

const app = express();
const port = process.env.PORT;

// Apply this to all routes
app.use(watchguard);

// Middleware
app.use(cors());
app.use(express.json());

// Routes

app.use('/shopify', shopifyRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});