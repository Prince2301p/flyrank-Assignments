import { createApp } from './app.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const { app } = createApp();

app.listen(PORT, () => {
  console.log(`🚀 AI Judgement API Server listening on port ${PORT}`);
  console.log(`📡 Endpoint: POST http://localhost:${PORT}/api/v1/triage`);
  console.log(`🏥 Healthcheck: GET http://localhost:${PORT}/health`);
});
