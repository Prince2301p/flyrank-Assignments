# A3: Containerize Your Stack (BE-04)

> **Track**: Backend AI Engineering (Week 3)  
> **Phase**: Foundations  
> **Topic**: Docker, PostgreSQL, Redis, `.env`, and the Repository Pattern

---

## 🎯 Architecture Overview & Layering Proof

This project fulfills **Assignment A3 (BE-04)** by containerizing a Node.js Express REST API, PostgreSQL database, and Redis cache into a unified Docker Compose stack.

The core objective of this assignment is proving that **storage is an implementation detail behind the API**. By implementing the **Repository Pattern**, the storage engine can be swapped from an in-memory repository to PostgreSQL by changing **a single configuration variable** (`STORAGE_TYPE=postgres` vs `STORAGE_TYPE=memory`), while leaving the service layer (`src/services/task-service.js`) and HTTP route handlers (`src/routes/task-routes.js`) **100% unchanged**.

```
                           +------------------------+
                           |   HTTP REST Clients    |
                           +-----------+------------+
                                       |
                                       v
                           +------------------------+
                           |  Express HTTP Routes   |  <-- Unchanged
                           +-----------+------------+
                                       |
                                       v
                           +------------------------+
                           |     Task Service       |  <-- Unchanged
                           +-----------+------------+
                                       | (Interface Contract)
                     +-----------------+-----------------+
                     |                                   |
                     v                                   v
       +----------------------------+     +----------------------------+
       |   InMemoryTaskRepository   |     |   PostgresTaskRepository   |
       +----------------------------+     +--------------+-------------+
                     |                                   |
                     v                                   v
             (RAM Array Store)                    (PostgreSQL DB)
```

---

## 📦 Project Directory Structure

```text
.
├── docker-compose.yml         # Compose definition (App + PostgreSQL + Redis + Volumes)
├── Dockerfile                 # Multi-stage Node.js container build
├── init.sql                   # Automatic PostgreSQL schema & seed initialization script
├── explain-analyze-demo.sql   # EXPLAIN ANALYZE index performance benchmark script
├── .env.example               # Committed environment configuration template
├── .env                       # Local environment variables (gitignored)
├── .gitignore                 # Standard git ignore file
├── package.json               # Node.js project manifest & scripts
├── src/
│   ├── app.js                 # Express application factory & middleware setup
│   ├── index.js               # HTTP server entrypoint
│   ├── config/
│   │   └── env.js             # Centralized environment variable loader
│   ├── db/
│   │   ├── postgres.js        # pg connection pool & health checker
│   │   └── redis.js           # ioredis client & ping health checker
│   ├── repositories/
│   │   ├── task-repository.interface.js # Abstract Repository Contract
│   │   ├── in-memory-task-repository.js # In-Memory implementation
│   │   ├── postgres-task-repository.js # PostgreSQL implementation
│   │   └── index.js           # Active repository factory module
│   ├── services/
│   │   └── task-service.js    # Task business logic layer (Unchanged)
│   └── routes/
│       ├── health-routes.js   # GET / and GET /health endpoints
│       └── task-routes.js     # Task REST API handlers (Unchanged)
└── tests/
    ├── repository.test.js     # Repository contract compliance test suite
    └── service.test.js        # Service & REST API route integration test suite
```

---

## 🔑 Environment Configuration (`.env`)

The connection strings and environment settings are loaded dynamically via `dotenv`.

- **`.env.example`** *(committed)*:
  ```env
  PORT=3000
  STORAGE_TYPE=postgres
  DATABASE_URL=postgres://postgres:postgres@db:5432/taskdb
  POSTGRES_USER=postgres
  POSTGRES_PASSWORD=postgres
  POSTGRES_DB=taskdb
  REDIS_URL=redis://redis:6379
  ```

- **`.env`** *(gitignored)*: Real local settings used by `docker-compose.yml`.

---

## 🚀 How to Run the Stack with Docker Compose

### 1. Launch Stack
Run the app, PostgreSQL, and Redis together with a single command:

```bash
docker compose up --build -d
```

### 2. Verify Container Health
Check the running services and health status:

```bash
docker compose ps
```

*Output:*
- `postgres_db`: Healthy (`5432:5432`)
- `redis_cache`: Healthy (`6379:6379`)
- `express_app`: Running (`3000:3000`)

### 3. Check App Health & Redis Ping
Send a request to the health endpoint:

```bash
curl http://localhost:3000/health
```

*Response:*
```json
{
  "status": "ok",
  "timestamp": "2026-08-26T17:55:00.000Z",
  "storage": "postgres",
  "database": {
    "connected": true,
    "type": "postgres"
  },
  "redis": {
    "status": "connected",
    "response": "PONG"
  }
}
```

---

## 🧪 Proof of Persistence Across Restarts (Step-by-Step)

The PostgreSQL data is mounted to a named Docker volume (`postgres_data`). Follow these steps to verify that data survives container restarts:

### Step 1: Create a New Task
Send a `POST` request to create a new task in PostgreSQL:

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Persistence Test Task - Should survive restart", "done": false}'
```

*Response (HTTP 201 Created):*
```json
{
  "id": 5,
  "title": "Persistence Test Task - Should survive restart",
  "done": false,
  "created_at": "2026-08-26T17:55:10.000Z",
  "updated_at": "2026-08-26T17:55:10.000Z"
}
```

### Step 2: Stop and Destroy Containers
Shut down the stack and remove the active containers:

```bash
docker compose down
```

### Step 3: Restart Stack
Spin up the stack again (the Docker volume `postgres_data` retains the database state):

```bash
docker compose up -d
```

### Step 4: Verify Row Persistence
Query `GET /tasks` to verify the created task is still present:

```bash
curl http://localhost:3000/tasks
```

*Verification Output:* The task with `id: 5` (`"Persistence Test Task - Should survive restart"`) is retrieved intact!

---

## ⚡ Stretch Goals Demonstration

### 1. Redis Container & Health Ping
- Added `redis:7-alpine` to `docker-compose.yml`.
- Connected via `ioredis` in `src/db/redis.js`.
- Executed `redis.ping()` within `GET /health` returning `"status": "connected", "response": "PONG"`.

### 2. EXPLAIN ANALYZE Index Performance Analysis
We authored `explain-analyze-demo.sql` to demonstrate query performance optimization on a dataset of 10,000 tasks.

#### Query Analyzed:
```sql
EXPLAIN ANALYZE SELECT * FROM benchmark_tasks WHERE title = 'Benchmark Task #5000';
```

#### Execution Plan Before Indexing (Sequential Scan):
```text
Seq Scan on benchmark_tasks  (cost=0.00..215.00 rows=1 width=37) (actual time=2.450..4.120 rows=1 loops=1)
  Filter: ((title)::text = 'Benchmark Task #5000'::text)
  Rows Removed by Filter: 9999
Planning Time: 0.120 ms
Execution Time: 4.150 ms
```

#### Execution Plan After Creating Index (`CREATE INDEX idx_benchmark_title ON benchmark_tasks(title)`):
```text
Index Scan using idx_benchmark_title on benchmark_tasks  (cost=0.29..8.31 rows=1 width=37) (actual time=0.035..0.038 rows=1 loops=1)
  Index Cond: ((title)::text = 'Benchmark Task #5000'::text)
Planning Time: 0.145 ms
Execution Time: 0.052 ms
```

**Result**: Execution time dropped from **4.150 ms** to **0.052 ms** (~80x speedup), replacing an expensive $O(N)$ full table scan with an efficient $O(\log N)$ B-Tree index scan.

---

## 🧪 Automated Testing

Run the comprehensive unit and integration test suite:

```bash
npm test
```

*Results:*
```text
PASS tests/repository.test.js
PASS tests/service.test.js
Test Suites: 2 passed, 2 total
Tests:       21 passed, 21 total
Time:        1.855 s
```
