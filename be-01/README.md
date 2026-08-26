# To-Do List CRUD API (BE-01)

A lightweight RESTful CRUD API for managing a To-Do list, built with **Node.js** and **Express**. Interactive documentation is available via **Swagger UI** (`swagger-ui-express`).

---

## 🚀 Quick Start (Run in under 1 minute)

### Prerequisites
- Node.js (v18+ recommended)

### Installation & Startup

```bash
# 1. Install dependencies
npm install

# 2. Start the server (One-line command)
npm start
```

The server will start listening at `http://localhost:3000`.

---

## 📋 API Endpoints Table

| HTTP Method | Endpoint | Status Codes | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | `200` | API metadata (name, version, supported endpoints) |
| `GET` | `/health` | `200` | Server health check (`{"status":"ok"}`) |
| `GET` | `/tasks` | `200` | List all tasks. Supports optional query filters `?done=true|false` & `?search=keyword` |
| `GET` | `/tasks/:id` | `200`, `404` | Get a specific task by numeric ID |
| `POST` | `/tasks` | `201`, `400` | Create a new task (`{"title": "..."}`). Auto-generates ID & sets `done: false` |
| `PUT` | `/tasks/:id` | `200`, `400`, `404` | Update task `title` and/or `done` status |
| `DELETE` | `/tasks/:id` | `204`, `404` | Remove a task by ID (returns `204 No Content`) |
| `GET` | `/stats` | `200` | Compute task statistics (`total`, `done`, `open`) |
| `POST` | `/reset` | `200` | Reset memory back to initial 3 seed tasks |
| `GET` | `/docs` | `200` | Interactive Swagger UI documentation |

---

## 🧪 Sample `curl -i` Execution Logs

### 1. Root Metadata (`GET /`)
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 58

{"name":"Task API","version":"1.0","endpoints":["/tasks"]}
```

### 2. Create Task (`POST /tasks`)
```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Content-Length: 40

{"id":4,"title":"Buy milk","done":false}
```

### 3. Validation Failure (`POST /tasks` with `{}`)
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8
Content-Length: 49

{"error":"Title is required and cannot be empty"}
```

### 4. Delete Task (`DELETE /tasks/4`)
```http
HTTP/1.1 204 No Content
Date: Wed, 26 Aug 2026 12:16:36 GMT
```

### 5. Resource Not Found (`GET /tasks/99`)
```http
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8
Content-Length: 26

{"error":"Task 99 not found"}
```

---

## 🎨 Swagger UI Interactive Documentation

Open `http://localhost:3000/docs` in any modern web browser to view interactive OpenAPI documentation. You can test all endpoints directly using the **"Try it out"** button.

---

## 🧪 The Mortality Experiment

When tasks are created, updated, or deleted, modifications are stored purely in the server's in-memory `tasks` array variable. Upon restarting the server, all newly added or modified tasks vanish and revert to the initial pre-filled seed state because variables only exist in volatile RAM memory during process execution, highlighting the fundamental need for persistent database storage.

---

## 🤖 Stage 7: AI vs Me

### AI Prompt Used
> "Write a complete Node.js Express To-Do CRUD API in a single `index.js` file with an in-memory array of tasks. Implement GET /, GET /health, GET /tasks, GET /tasks/:id, POST /tasks, PUT /tasks/:id, and DELETE /tasks/:id with status codes 200, 201, 204, 400, and 404 with JSON error messages. Validate missing/empty title on POST and PUT. Serve Swagger UI at /docs using swagger-ui-express."

### Key Differences Observed

1. **Input Validation Rigor**:
   - **Hand-built code**: Validates non-empty string types, strips whitespace via `.trim()`, and handles edge cases where `title` or `done` is undefined vs empty string.
   - **AI-generated code**: Performs basic truthiness checks (`if (!title)`) but accepts whitespace-only titles like `"   "` as valid input.

2. **Error Message Consistency & Status Codes**:
   - **Hand-built code**: Strictly returns `204 No Content` with an empty body on successful deletion, and returns clear, descriptive JSON errors `{ "error": "Task 99 not found" }` for `404` cases.
   - **AI-generated code**: Returned `200 OK` with `{ message: "Task deleted" }` for `DELETE /tasks/:id` instead of the requested standard HTTP status `204 No Content`.

3. **OpenAPI Schema Quality**:
   - **Hand-built code**: Uses a modular `openapi.json` file with query parameter specs, explicit schema components (`Task`, `TaskInput`, `Error`), and status code responses.
   - **AI-generated code**: Inlined a minimal OpenAPI object directly in `index.js` omitting response body schemas for `400` and `404` errors.

### AI Rematch Summary
> Re-prompting the AI with explicit instructions for HTTP status code `204` on DELETE and mandatory `.trim()` validation resolved the status code mismatch, demonstrating that AI code generation quality is directly constrained by prompt specificity.
