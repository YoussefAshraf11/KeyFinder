const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoute.js'); 

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mount auth routes under /api/auth
app.use('/api/auth', authRoutes);

// Health check or other routes
app.get('/', (req, res) => {
  res.send('API is running');
});

module.exports = app;
