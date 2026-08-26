const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./openapi.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve Swagger UI documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// In-memory list of task objects
let tasks = [
  { id: 1, title: 'Buy groceries', done: false },
  { id: 2, title: 'Read a book', done: true },
  { id: 3, title: 'Write backend code', done: false }
];

app.get('/', (req, res) => {
  res.json({
    name: 'Task API',
    version: '1.0',
    endpoints: ['/tasks']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// GET /tasks - list all tasks with optional ?done=true/false and ?search=term filtering
app.get('/tasks', (req, res) => {
  let result = [...tasks];

  // Filtering by done status
  if (req.query.done !== undefined) {
    const isDone = req.query.done.toLowerCase() === 'true';
    result = result.filter(t => t.done === isDone);
  }

  // Searching title by keyword
  if (req.query.search !== undefined && req.query.search.trim() !== '') {
    const query = req.query.search.trim().toLowerCase();
    result = result.filter(t => t.title.toLowerCase().includes(query));
  }

  res.json(result);
});

// GET /stats - statistics summary endpoint
app.get('/stats', (req, res) => {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const open = total - done;

  res.json({
    total,
    done,
    open
  });
});

// POST /reset - restores initial seed tasks
app.post('/reset', (req, res) => {
  tasks = [
    { id: 1, title: 'Buy groceries', done: false },
    { id: 2, title: 'Read a book', done: true },
    { id: 3, title: 'Write backend code', done: false }
  ];
  res.json({ message: 'Tasks reset to initial state', count: tasks.length });
});

// GET /tasks/:id - get single task by ID
app.get('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  res.json(task);
});

// POST /tasks - create a new task
app.post('/tasks', (req, res) => {
  const { title } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required and cannot be empty' });
  }

  const nextId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
  const newTask = {
    id: nextId,
    title: title.trim(),
    done: false
  };

  tasks.push(newTask);
  res.status(201).json(newTask);
});

// PUT /tasks/:id - update an existing task
app.put('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  const { title, done } = req.body || {};

  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: 'Request body must contain title or done' });
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    task.title = title.trim();
  }

  if (done !== undefined) {
    if (typeof done !== 'boolean') {
      return res.status(400).json({ error: 'Done must be a boolean (true/false)' });
    }
    task.done = done;
  }

  res.json(task);
});

// DELETE /tasks/:id - delete a task by ID
app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  tasks.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
