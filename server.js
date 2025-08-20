require('dotenv').config();

const express = require('express');
const cors = require('cors');
const shopifyRoutes = require('./routes/shopifyRoutes');

const app = express();
const port = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// Routes

app.use('/shopify', shopifyRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});