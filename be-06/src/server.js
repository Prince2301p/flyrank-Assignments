const express = require('express');
const cors = require('cors');
const path = require('path');
const jobRoutes = require('./routes/jobRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static UI Dashboard
app.use(express.static(path.join(__dirname, '../public')));

// Mount API Routes
app.use('/api/v1/jobs', jobRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'BE-06 Background Job Processing Engine'
  });
});

// Start Server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 BE-06 Background Job Processing System Online`);
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`💻 Dashboard UI:       http://localhost:${PORT}/`);
    console.log(`📩 Post Job (202):    POST http://localhost:${PORT}/api/v1/jobs/ai-generate`);
    console.log(`🔍 Status Check:      GET http://localhost:${PORT}/api/v1/jobs/:id`);
    console.log(`🚨 System Alerts:     GET http://localhost:${PORT}/api/v1/jobs/system/alerts`);
    console.log(`==================================================\n`);
  });

  // Graceful Shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down server gracefully...');
    server.close(() => process.exit(0));
  });
}

module.exports = app;
