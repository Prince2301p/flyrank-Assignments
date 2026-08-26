/**
 * Abstract Task Repository Interface Contract
 * Both InMemoryTaskRepository and PostgresTaskRepository must strictly conform to these method signatures.
 */
class TaskRepositoryInterface {
  async findAll({ done, search, sort } = {}) {
    throw new Error('Method findAll() must be implemented');
  }

  async findById(id) {
    throw new Error('Method findById() must be implemented');
  }

  async create({ title, done = false }) {
    throw new Error('Method create() must be implemented');
  }

  async update(id, { title, done }) {
    throw new Error('Method update() must be implemented');
  }

  async delete(id) {
    throw new Error('Method delete() must be implemented');
  }

  async getStats() {
    throw new Error('Method getStats() must be implemented');
  }

  async reset() {
    throw new Error('Method reset() must be implemented');
  }
}

module.exports = TaskRepositoryInterface;
