const config = require('../config/env');
const InMemoryTaskRepository = require('./in-memory-task-repository');
const PostgresTaskRepository = require('./postgres-task-repository');

let activeRepository = null;

function getTaskRepository(overrideType, customInstance) {
  if (customInstance) {
    return customInstance;
  }

  const storageType = (overrideType || config.STORAGE_TYPE).toLowerCase();

  if (storageType === 'memory' || storageType === 'in-memory') {
    if (!activeRepository || !(activeRepository instanceof InMemoryTaskRepository)) {
      activeRepository = new InMemoryTaskRepository();
    }
  } else {
    if (!activeRepository || !(activeRepository instanceof PostgresTaskRepository)) {
      activeRepository = new PostgresTaskRepository();
    }
  }

  return activeRepository;
}

module.exports = {
  getTaskRepository,
  InMemoryTaskRepository,
  PostgresTaskRepository
};
