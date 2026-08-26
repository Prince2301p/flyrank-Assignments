const TaskRepositoryInterface = require('./task-repository.interface');

class InMemoryTaskRepository extends TaskRepositoryInterface {
  constructor(initialTasks = []) {
    super();
    this.tasks = initialTasks.length > 0 ? [...initialTasks] : [
      { id: 1, title: 'Buy groceries', done: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 2, title: 'Walk the dog', done: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 3, title: 'Finish backend assignment', done: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];
    this.currentId = this.tasks.reduce((max, task) => Math.max(max, task.id), 0);
  }

  async findAll({ done, search, sort } = {}) {
    let result = [...this.tasks];

    if (done !== undefined && done !== null) {
      const isDone = done === 'true' || done === true || done === '1' || done === 1;
      result = result.filter(task => task.done === isDone);
    }

    if (search) {
      const keyword = search.toLowerCase();
      result = result.filter(task => task.title.toLowerCase().includes(keyword));
    }

    if (sort === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'created_at') {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      result.sort((a, b) => a.id - b.id);
    }

    return result;
  }

  async findById(id) {
    const numericId = parseInt(id, 10);
    const task = this.tasks.find(t => t.id === numericId);
    return task ? { ...task } : null;
  }

  async create({ title, done = false }) {
    this.currentId += 1;
    const now = new Date().toISOString();
    const newTask = {
      id: this.currentId,
      title,
      done: Boolean(done),
      created_at: now,
      updated_at: now
    };
    this.tasks.push(newTask);
    return { ...newTask };
  }

  async update(id, { title, done }) {
    const numericId = parseInt(id, 10);
    const index = this.tasks.findIndex(t => t.id === numericId);
    if (index === -1) return null;

    if (title !== undefined) this.tasks[index].title = title;
    if (done !== undefined) this.tasks[index].done = Boolean(done);
    this.tasks[index].updated_at = new Date().toISOString();

    return { ...this.tasks[index] };
  }

  async delete(id) {
    const numericId = parseInt(id, 10);
    const index = this.tasks.findIndex(t => t.id === numericId);
    if (index === -1) return false;

    this.tasks.splice(index, 1);
    return true;
  }

  async getStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.done).length;
    const pending = total - completed;
    return { total, completed, pending };
  }

  async reset() {
    this.tasks = [
      { id: 1, title: 'Buy groceries', done: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 2, title: 'Walk the dog', done: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 3, title: 'Finish backend assignment', done: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];
    this.currentId = 3;
    return [...this.tasks];
  }
}

module.exports = InMemoryTaskRepository;
