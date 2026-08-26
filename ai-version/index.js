const express = require('express');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

let tasks = [
  { id: 1, title: 'Buy groceries', done: false },
  { id: 2, title: 'Read a book', done: true },
  { id: 3, title: 'Write backend code', done: false }
];

const openapiSpec = {
  openapi: '3.0.0',
  info: { title: 'AI Generated Task API', version: '1.0.0' },
  paths: {
    '/tasks': {
      get: { summary: 'Get tasks', responses: { '200': { description: 'OK' } } },
      post: { summary: 'Create task', responses: { '201': { description: 'Created' }, '400': { description: 'Bad Request' } } }
    }
  }
};

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.get('/', (req, res) => {
  res.json({ name: 'Task API', version: '1.0', endpoints: ['/tasks'] });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/tasks', (req, res) => {
  res.json(tasks);
});

app.get('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: `Task ${req.params.id} not found` });
  res.json(task);
});

app.post('/tasks', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const newTask = { id: tasks.length + 1, title, done: false };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.put('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: `Task ${req.params.id} not found` });
  if (req.body.title !== undefined) task.title = req.body.title;
  if (req.body.done !== undefined) task.done = req.body.done;
  res.json(task);
});

app.delete('/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: `Task ${req.params.id} not found` });
  tasks.splice(index, 1);
  res.json({ message: 'Task deleted' }); // Note: AI returned 200 OK with JSON instead of 204 No Content
});

app.listen(PORT, () => {
  console.log(`AI version server running on port ${PORT}`);
});
