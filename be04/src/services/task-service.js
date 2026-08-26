const { getTaskRepository } = require('../repositories');

class TaskNotFoundError extends Error {
  constructor(id) {
    super(`Task ${id} not found`);
    this.name = 'TaskNotFoundError';
    this.statusCode = 404;
  }
}

class InvalidTaskDataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidTaskDataError';
    this.statusCode = 400;
  }
}

class TaskService {
  constructor(repository) {
    this.repository = repository || getTaskRepository();
  }

  async getAllTasks(query = {}) {
    return await this.repository.findAll(query);
  }

  async getTaskById(id) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new InvalidTaskDataError('Invalid task ID format');
    }

    const task = await this.repository.findById(numericId);
    if (!task) {
      throw new TaskNotFoundError(numericId);
    }
    return task;
  }

  async createTask(data) {
    if (!data || typeof data.title !== 'string' || data.title.trim() === '') {
      throw new InvalidTaskDataError('Title is required and cannot be empty');
    }

    return await this.repository.create({
      title: data.title.trim(),
      done: data.done !== undefined ? Boolean(data.done) : false
    });
  }

  async updateTask(id, data) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new InvalidTaskDataError('Invalid task ID format');
    }

    if (!data || (data.title === undefined && data.done === undefined)) {
      throw new InvalidTaskDataError('Must provide title or done field to update');
    }

    if (data.title !== undefined && (typeof data.title !== 'string' || data.title.trim() === '')) {
      throw new InvalidTaskDataError('Title cannot be empty string');
    }

    const updatePayload = {};
    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.done !== undefined) updatePayload.done = Boolean(data.done);

    const updatedTask = await this.repository.update(numericId, updatePayload);
    if (!updatedTask) {
      throw new TaskNotFoundError(numericId);
    }
    return updatedTask;
  }

  async deleteTask(id) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new InvalidTaskDataError('Invalid task ID format');
    }

    const success = await this.repository.delete(numericId);
    if (!success) {
      throw new TaskNotFoundError(numericId);
    }
    return true;
  }

  async getTaskStats() {
    return await this.repository.getStats();
  }

  async resetTasks() {
    return await this.repository.reset();
  }
}

module.exports = {
  TaskService,
  TaskNotFoundError,
  InvalidTaskDataError
};
