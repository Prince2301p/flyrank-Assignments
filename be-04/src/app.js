const express = require('express');
const healthRoutes = require('./routes/health-routes');
const createTaskRoutes = require('./routes/task-routes');

function createApp(serviceInstance) {
  const app = express();

  app.use(express.json());

  // Mount routes
  app.use('/', healthRoutes);
  app.use('/', createTaskRoutes(serviceInstance));

  // Centralized Error Handling Middleware
  app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(err.statusCode || 500).json({
      error: err.message || 'Internal Server Error'
    });
  });

  return app;
}

module.exports = createApp;
