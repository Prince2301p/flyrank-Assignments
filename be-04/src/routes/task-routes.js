const express = require('express');
const { TaskService, TaskNotFoundError, InvalidTaskDataError } = require('../services/task-service');

function createTaskRoutes(serviceInstance) {
  const router = express.Router();
  const service = serviceInstance || new TaskService();

  // GET /tasks - Read all tasks (with optional query filters: ?done=true, ?search=foo, ?sort=title)
  router.get('/tasks', async (req, res, next) => {
    try {
      const tasks = await service.getAllTasks(req.query);
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  });

  // GET /stats - Aggregate task statistics
  router.get('/stats', async (req, res, next) => {
    try {
      const stats = await service.getTaskStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  // GET /tasks/:id - Read single task
  router.get('/tasks/:id', async (req, res, next) => {
    try {
      const task = await service.getTaskById(req.params.id);
      res.json(task);
    } catch (err) {
      if (err instanceof TaskNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      if (err instanceof InvalidTaskDataError) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  });

  // POST /tasks - Create task
  router.post('/tasks', async (req, res, next) => {
    try {
      const task = await service.createTask(req.body);
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof InvalidTaskDataError) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  });

  // PUT /tasks/:id - Update task
  router.put('/tasks/:id', async (req, res, next) => {
    try {
      const task = await service.updateTask(req.params.id, req.body);
      res.json(task);
    } catch (err) {
      if (err instanceof TaskNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      if (err instanceof InvalidTaskDataError) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  });

  // DELETE /tasks/:id - Delete task
  router.delete('/tasks/:id', async (req, res, next) => {
    try {
      await service.deleteTask(req.params.id);
      res.status(204).send();
    } catch (err) {
      if (err instanceof TaskNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      if (err instanceof InvalidTaskDataError) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  });

  // POST /reset - Reset tasks to initial seed state
  router.post('/reset', async (req, res, next) => {
    try {
      const tasks = await service.resetTasks();
      res.json({ message: 'Tasks reset to initial state', count: tasks.length });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createTaskRoutes;
