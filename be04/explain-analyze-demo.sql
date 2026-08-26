-- Stretch Goal: EXPLAIN ANALYZE Index Demonstration Script
-- Demonstrates query plan improvement when searching filtered/indexed columns

-- 1. Create a sample table without index for benchmark comparison
CREATE TABLE IF NOT EXISTS benchmark_tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed 10,000 tasks into benchmark_tasks
INSERT INTO benchmark_tasks (title, done)
SELECT 
    'Benchmark Task #' || g.i,
    (g.i % 2 = 0)
FROM generate_series(1, 10000) AS g(i)
WHERE NOT EXISTS (SELECT 1 FROM benchmark_tasks LIMIT 1);

-- 3. Query BEFORE index creation (Sequential Scan)
-- EXPLAIN ANALYZE SELECT * FROM benchmark_tasks WHERE done = true AND title LIKE '%5000%';
EXPLAIN ANALYZE SELECT * FROM benchmark_tasks WHERE title = 'Benchmark Task #5000';

-- 4. Create index on title column
CREATE INDEX IF NOT EXISTS idx_benchmark_title ON benchmark_tasks(title);

-- 5. Query AFTER index creation (Index Scan / Bitmap Index Scan)
EXPLAIN ANALYZE SELECT * FROM benchmark_tasks WHERE title = 'Benchmark Task #5000';
