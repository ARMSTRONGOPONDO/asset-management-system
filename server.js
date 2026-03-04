const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

const connectDB = require('./config/db');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Redirect root to login page to avoid older index.html
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const acquisitionRoutes = require('./routes/acquisitions');
const disposalRoutes = require('./routes/disposals');
const maintenanceRoutes = require('./routes/maintenance');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/acquisitions', acquisitionRoutes);
app.use('/api/disposals', disposalRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

// Connect to MongoDB
connectDB();

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

