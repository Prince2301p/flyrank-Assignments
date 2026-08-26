require('dotenv').config();
const express = require('express');
const supabase = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const protectedRoutes = require('./routes/protected');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./swagger/openapi.json');

app.use(express.json());

// Serve Swagger Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Routes
app.use('/auth', authRoutes);
app.use('/public', publicRoutes);
app.use('/protected', protectedRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is healthy' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running and connected to Supabase on port ${PORT}`);
  });
}

module.exports = app;
