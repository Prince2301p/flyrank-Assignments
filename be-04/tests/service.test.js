const request = require('supertest');
const createApp = require('../src/app');
const { TaskService } = require('../src/services/task-service');
const InMemoryTaskRepository = require('../src/repositories/in-memory-task-repository');
const PostgresTaskRepository = require('../src/repositories/postgres-task-repository');

// Mock db/redis connection checks for fast unit tests
jest.mock('../src/db/postgres', () => ({
  checkConnection: jest.fn().mockResolvedValue({ connected: true, type: 'postgres' }),
  getPool: jest.fn()
}));

jest.mock('../src/db/redis', () => ({
  pingRedis: jest.fn().mockResolvedValue({ status: 'connected', response: 'PONG' })
}));

describe('Task REST API Endpoints & Layering Verification', () => {
  let app;
  let inMemoryRepo;

  beforeEach(() => {
    inMemoryRepo = new InMemoryTaskRepository();
    const service = new TaskService(inMemoryRepo);
    app = createApp(service);
  });

  test('GET / returns root API metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toContain('Task API');
  });

  test('GET /health returns 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /tasks returns task array', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
  });

  test('GET /tasks/:id returns single task', async () => {
    const res = await request(app).get('/tasks/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.title).toBe('Buy groceries');
  });

  test('GET /tasks/:id returns 404 for non-existent task', async () => {
    const res = await request(app).get('/tasks/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Task 999 not found');
  });

  test('POST /tasks creates task with 201 Created', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New integration task', done: false });
    
    expect(res.status).toBe(201);
    expect(res.body.id).toBeGreaterThan(0);
    expect(res.body.title).toBe('New integration task');
  });

  test('POST /tasks returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({});
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Title is required');
  });

  test('PUT /tasks/:id updates task', async () => {
    const res = await request(app)
      .put('/tasks/1')
      .send({ done: true });
    
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.done).toBe(true);
  });

  test('DELETE /tasks/:id deletes task with 204 No Content', async () => {
    const res = await request(app).delete('/tasks/1');
    expect(res.status).toBe(204);

    const getRes = await request(app).get('/tasks/1');
    expect(getRes.status).toBe(404);
  });

  test('GET /stats returns task aggregate statistics', async () => {
    const res = await request(app).get('/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('completed');
    expect(res.body).toHaveProperty('pending');
  });

  describe('PostgreSQL Storage Engine Swapping Proof', () => {
    test('Routes behave identically when swapping repository to PostgresTaskRepository', async () => {
      const mockPool = {
        query: jest.fn().mockImplementation(async (sql, params) => {
          if (sql.includes('SELECT id, title, done')) {
            return {
              rows: [
                { id: 101, title: 'PostgreSQL Task', done: false, created_at: new Date(), updated_at: new Date() }
              ]
            };
          }
          return { rows: [] };
        })
      };

      const pgRepo = new PostgresTaskRepository(mockPool);
      const pgService = new TaskService(pgRepo);
      const pgApp = createApp(pgService);

      const res = await request(pgApp).get('/tasks/101');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(101);
      expect(res.body.title).toBe('PostgreSQL Task');
      expect(res.body.done).toBe(false);
    });
  });
});

