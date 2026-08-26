-- Database Initialization Script for Task DB
-- Mounted at /docker-entrypoint-initdb.d/init.sql

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index on done status to accelerate GET /tasks?done=true|false
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);

-- Index on title to accelerate GET /tasks?search=keyword
CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks(title);

-- Initial seed data insertion if table is empty
INSERT INTO tasks (title, done)
SELECT 'Containerize backend with Docker Compose', true
WHERE NOT EXISTS (SELECT 1 FROM tasks);

INSERT INTO tasks (title, done)
SELECT 'Connect Express app to PostgreSQL database', true
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Connect Express app to PostgreSQL database');

INSERT INTO tasks (title, done)
SELECT 'Implement Redis ping health check', false
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Implement Redis ping health check');

INSERT INTO tasks (title, done)
SELECT 'Verify persistence across container restart', false
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Verify persistence across container restart');
