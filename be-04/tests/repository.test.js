const InMemoryTaskRepository = require('../src/repositories/in-memory-task-repository');
const PostgresTaskRepository = require('../src/repositories/postgres-task-repository');

describe('Task Repositories Contract Tests', () => {
  describe('InMemoryTaskRepository', () => {
    let repo;

    beforeEach(() => {
      repo = new InMemoryTaskRepository();
    });

    test('findAll returns initial tasks', async () => {
      const tasks = await repo.findAll();
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBe(3);
      expect(tasks[0]).toHaveProperty('id');
      expect(tasks[0]).toHaveProperty('title');
      expect(tasks[0]).toHaveProperty('done');
    });

    test('findById returns specific task or null', async () => {
      const task = await repo.findById(1);
      expect(task).not.toBeNull();
      expect(task.id).toBe(1);

      const notFound = await repo.findById(999);
      expect(notFound).toBeNull();
    });

    test('create adds a new task', async () => {
      const created = await repo.create({ title: 'Test Task', done: false });
      expect(created.id).toBeGreaterThan(0);
      expect(created.title).toBe('Test Task');
      expect(created.done).toBe(false);

      const found = await repo.findById(created.id);
      expect(found).toEqual(created);
    });

    test('update modifies an existing task', async () => {
      const updated = await repo.update(1, { title: 'Updated Title', done: true });
      expect(updated.title).toBe('Updated Title');
      expect(updated.done).toBe(true);

      const fetched = await repo.findById(1);
      expect(fetched.title).toBe('Updated Title');
      expect(fetched.done).toBe(true);
    });

    test('delete removes a task', async () => {
      const success = await repo.delete(1);
      expect(success).toBe(true);

      const fetched = await repo.findById(1);
      expect(fetched).toBeNull();
    });

    test('getStats calculates total, completed, pending', async () => {
      const stats = await repo.getStats();
      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(2);
    });
  });

  describe('PostgresTaskRepository (Mocked Pool Verification)', () => {
    let mockPool;
    let repo;

    beforeEach(() => {
      mockPool = {
        query: jest.fn()
      };
      repo = new PostgresTaskRepository(mockPool);
    });

    test('findAll constructs correct SQL query with filters', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'PG Task 1', done: false, created_at: new Date(), updated_at: new Date() }
        ]
      });

      const tasks = await repo.findAll({ done: 'false', search: 'PG' });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE done = $1 AND title ILIKE $2'),
        [false, '%PG%']
      );
      expect(tasks.length).toBe(1);
      expect(tasks[0].title).toBe('PG Task 1');
    });

    test('create executes INSERT INTO tasks query', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 10, title: 'New PG Task', done: true, created_at: new Date(), updated_at: new Date() }
        ]
      });

      const created = await repo.create({ title: 'New PG Task', done: true });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tasks'),
        ['New PG Task', true]
      );
      expect(created.id).toBe(10);
      expect(created.done).toBe(true);
    });

    test('update executes UPDATE query correctly', async () => {
      // Mock findById check inside update
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 5, title: 'Old Title', done: false, created_at: new Date(), updated_at: new Date() }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 5, title: 'New Title', done: true, created_at: new Date(), updated_at: new Date() }]
        });

      const updated = await repo.update(5, { title: 'New Title', done: true });
      expect(updated.title).toBe('New Title');
      expect(updated.done).toBe(true);
    });

    test('delete executes DELETE query', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const deleted = await repo.delete(5);
      expect(deleted).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM tasks WHERE id = $1'),
        [5]
      );
    });
  });
});
