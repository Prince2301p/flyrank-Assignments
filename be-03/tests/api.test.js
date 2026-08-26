const http = require('http');
const app = require('../src/app');

let server;
const PORT = 3001;

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({ statusCode: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'object' ? JSON.stringify(body) : body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Automated Verification Tests...\n');
  server = app.listen(PORT);

  let passed = 0;
  let failed = 0;

  async function assertTest(name, fn) {
    try {
      await fn();
      console.log(`✅ PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Reason: ${err.message}`);
      failed++;
    }
  }

  // 1. Health check
  await assertTest('GET /health returns 200', async () => {
    const res = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/health',
      method: 'GET',
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
  });

  // 2. Public info
  await assertTest('GET /public/info returns 200 public message', async () => {
    const res = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/public/info',
      method: 'GET',
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (res.body.message !== 'Welcome stranger! This info is public.') {
      throw new Error(`Unexpected message: ${JSON.stringify(res.body)}`);
    }
  });

  // 3. Protected profile without header
  await assertTest('GET /protected/profile without Auth header returns 401', async () => {
    const res = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/protected/profile',
      method: 'GET',
    });
    if (res.statusCode !== 401) throw new Error(`Expected 401, got ${res.statusCode}`);
    if (res.body.error !== 'Access token required') {
      throw new Error(`Expected "Access token required", got "${res.body.error}"`);
    }
  });

  // 4. Protected profile with invalid token
  await assertTest('GET /protected/profile with invalid token returns 401', async () => {
    const res = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/protected/profile',
      method: 'GET',
      headers: { Authorization: 'Bearer invalid_jwt_token_123' },
    });
    if (res.statusCode !== 401) throw new Error(`Expected 401, got ${res.statusCode}`);
    if (res.body.error !== 'Invalid or expired token') {
      throw new Error(`Expected "Invalid or expired token", got "${res.body.error}"`);
    }
  });

  // 5. Signup missing body
  await assertTest('POST /auth/signup with empty payload returns 400', async () => {
    const res = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/auth/signup',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {}
    );
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}`);
  });

  // 6. Login missing body
  await assertTest('POST /auth/login with empty payload returns 400', async () => {
    const res = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {}
    );
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}`);
  });

  // 7. Login with invalid credentials
  await assertTest('POST /auth/login with bad credentials returns 401', async () => {
    const res = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'nonexistent@example.com', password: 'wrongpassword' }
    );
    if (res.statusCode !== 401) throw new Error(`Expected 401, got ${res.statusCode}`);
    if (res.body.error !== 'Invalid login credentials') {
      throw new Error(`Expected "Invalid login credentials", got "${res.body.error}"`);
    }
  });

  // 8. Swagger UI endpoint
  await assertTest('GET /docs returns 200 Swagger UI', async () => {
    const res = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/docs/',
      method: 'GET',
    });
    if (res.statusCode !== 200 && res.statusCode !== 301) {
      throw new Error(`Expected 200 or 301, got ${res.statusCode}`);
    }
  });

  server.close();

  console.log(`\n📊 Test Summary: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  if (server) server.close();
  process.exit(1);
});
