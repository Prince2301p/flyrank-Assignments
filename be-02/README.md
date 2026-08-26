# BE-02: Connecting to the Database (SQLite Persistent REST API)

A persistent To-Do List RESTful API built with **Node.js**, **Express**, and **SQLite** (using `better-sqlite3`).

This project transitions the in-memory CRUD API built in Assignment 1 to a persistent SQL storage layer. Clients continue sending identical HTTP requests to the same endpoints, but all data now survives server restarts.

---

## 💡 Why SQLite Was Chosen

1. **Zero Configuration**: SQLite requires no separate server installation, port configuration, or daemon process.
2. **Single-File Database**: The entire database is contained within a single local file (`tasks.db`), making development, testing, and deployment lightweight and self-contained.
3. **Automated Schema & Seeding**: On the application's initial launch, SQLite automatically creates `tasks.db`, constructs the `tasks` schema table, and populates initial seed records if empty.
4. **Standard SQL Syntax**: Provides full relational database features (ACID compliance, transactions, indexing, SQL queries like `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `COUNT()`, `LIKE`) while keeping setup zero-overhead.

---

## 📁 Database File Location

- **File Name**: `tasks.db`
- **Location**: Root directory of the repository (`./tasks.db`)
- **Write-Ahead Logging**: SQLite WAL files (`tasks.db-wal` & `tasks.db-shm`) may be temporarily created during execution for optimal concurrency and performance.

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

> **Note on Boolean Mapping**: SQLite stores `done` as `INTEGER` (`0` for `false`, `1` for `true`). The API automatically formats `done` as JavaScript booleans (`true`/`false`) in JSON API responses.

---

## 🚀 How to Start the Project

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm**

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd BE-02-connecting-to-database
npm install
```

### 3. Running the Server
Start the Express server:
```bash
npm start
```
The server will start on `http://localhost:3000`. On first run, it will automatically create `tasks.db` and seed 3 initial tasks.

### 4. Interactive API Documentation
Open your browser and navigate to:
```text
http://localhost:3000/docs
```
to view and test the API using **Swagger UI**.

### 5. Running Automated Verification Tests
```bash
npm test
```

### 6. Executing Stage 4 Raw SQL Queries
```bash
npm run stage4-sql
```

---

## 🖥️ Database Viewer & Inspection

You can open `tasks.db` using any SQLite GUI tool (such as **DB Browser for SQLite** or **VS Code SQLite Viewer**).

```text
+-----------------------------------------------------------------------------------+
|                            DB Browser for SQLite - tasks.db                       |
+-----------------------------------------------------------------------------------+
| File Structure | Data Browser | Execute SQL                                        |
+----+--------------------------------+-------+---------------------+---------------+
| id | title                          | done  | created_at          | updated_at    |
+----+--------------------------------+-------+---------------------+---------------+
|  1 | Buy groceries                  |   0   | 2026-08-26 12:22:00 | 2026-08-26... |
|  2 | Walk the dog                   |   0   | 2026-08-26 12:22:00 | 2026-08-26... |
|  3 | Finish backend assignment      |   1   | 2026-08-26 12:22:00 | 2026-08-26... |
+----+--------------------------------+-------+---------------------+---------------+
| Row 1 of 3                                                                        |
+-----------------------------------------------------------------------------------+
```

---

## 🔍 Example Raw SQL Query Executed

Here is an example query executed during **Stage 4** to query all completed tasks:

```sql
SELECT id, title, done, created_at 
FROM tasks 
WHERE done = 1;
```

**Output returned from SQLite:**
```text
+----+----------------------------+------+---------------------+
| id | title                      | done | created_at          |
+----+----------------------------+------+---------------------+
|  3 | Finish backend assignment  |    1 | 2026-08-26 12:22:00 |
+----+----------------------------+------+---------------------+
```

---

## 📌 API Endpoint Summary

| HTTP Method | Route | Status Code | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | `200 OK` | API information & list of endpoints |
| `GET` | `/health` | `200 OK` | Health check endpoint |
| `GET` | `/tasks` | `200 OK` | Fetch all tasks from SQLite. Supports `?done=true`, `?search=term`, `?sort=title` |
| `GET` | `/tasks/:id` | `200 OK` / `404` | Fetch single task by ID |
| `POST` | `/tasks` | `201 Created` / `400` | Insert new task into SQLite database |
| `PUT` | `/tasks/:id` | `200 OK` / `400` / `404` | Update task title and/or completed status in SQLite |
| `DELETE` | `/tasks/:id` | `204 No Content` / `404` | Delete task row from SQLite database |
| `GET` | `/stats` | `200 OK` | Task statistics (`total`, `done`, `open`) using SQL `COUNT()` |
| `POST` | `/reset` | `200 OK` | Reset `tasks` table to 3 initial seed tasks |
| `GET` | `/docs` | `200 OK` | Interactive Swagger UI documentation |

---

## 🛠️ Verification Checkpoint Proof

- **Server Restart Data Survival**: Tested via `npm test` by inserting a task, shutting down the server process, re-binding to a new server process, and fetching `/tasks`. The task persisted in `tasks.db`.
- **Automatic Setup**: A fresh clone without `tasks.db` will generate the file and seed data automatically on `npm start`.
