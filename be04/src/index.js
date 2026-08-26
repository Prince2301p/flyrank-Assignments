const createApp = require('./app');
const config = require('./config/env');

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`=================================================`);
  console.log(` Task API Server running on port ${config.PORT}`);
  console.log(` Storage Engine: ${config.STORAGE_TYPE.toUpperCase()}`);
  console.log(` Database URL:   ${config.DATABASE_URL}`);
  console.log(` Redis URL:      ${config.REDIS_URL}`);
  console.log(`=================================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = server;
