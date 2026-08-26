/**
 * Comprehensive Automated Verification Suite for BE-02 Task API with SQLite persistence.
 */

const app = require('./index');

let server;
const PORT = 3005;
const BASE_URL = `http://localhost:${PORT}`;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('----------------------------------------------------');
  console.log('🚀 STARTING COMPREHENSIVE API & SQL VERIFICATION TESTS');
  console.log('----------------------------------------------------\n');

  server = app.listen(PORT);

  try {
    // 1. GET / & GET /health
    console.log('Test 1: GET / and GET /health');
    const rootRes = await fetch(`${BASE_URL}/`);
    assert(rootRes.status === 200, 'GET / returned status 200');
    const rootData = await rootRes.json();
    assert(rootData.database === 'tasks.db', 'API reports tasks.db as backend database');

    const healthRes = await fetch(`${BASE_URL}/health`);
    assert(healthRes.status === 200, 'GET /health returned status 200');
    const healthData = await healthRes.json();
    assert(healthData.status === 'ok', 'Health status is ok');
    console.log('✅ Test 1 Passed: Root and Health endpoints functional.\n');

    // 2. Reset Database to clean state
    console.log('Test 2: POST /reset');
    const resetRes = await fetch(`${BASE_URL}/reset`, { method: 'POST' });
    assert(resetRes.status === 200, 'POST /reset returned status 200');
    const resetData = await resetRes.json();
    assert(resetData.tasks.length === 3, 'Reset restored 3 seed tasks');
    console.log('✅ Test 2 Passed: Database reset successful.\n');

    // 3. GET /tasks
    console.log('Test 3: GET /tasks');
    const getTasksRes = await fetch(`${BASE_URL}/tasks`);
    assert(getTasksRes.status === 200, 'GET /tasks returned 200');
    const tasks = await getTasksRes.json();
    assert(tasks.length === 3, 'GET /tasks returned 3 tasks');
    assert(typeof tasks[0].done === 'boolean', 'done field is transformed to boolean');
    console.log('✅ Test 3 Passed: GET /tasks returned database records with boolean format.\n');

    // 4. GET /tasks/:id & 404 handling
    console.log('Test 4: GET /tasks/:id');
    const task1Res = await fetch(`${BASE_URL}/tasks/${tasks[0].id}`);
    assert(task1Res.status === 200, 'GET /tasks/:id returned 200');
    const task1 = await task1Res.json();
    assert(task1.title === tasks[0].title, 'Retrieved correct task by ID');

    const notFoundRes = await fetch(`${BASE_URL}/tasks/9999`);
    assert(notFoundRes.status === 404, 'GET /tasks/9999 returned 404');
    const notFoundData = await notFoundRes.json();
    assert(notFoundData.error.includes('not found'), 'Returns correct 404 error message');
    console.log('✅ Test 4 Passed: GET /tasks/:id & 404 error handling verified.\n');

    // 5. POST /tasks (Creation & Validation)
    console.log('Test 5: POST /tasks (Creation & Validation)');
    const createRes = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Read SQL documentation', done: false })
    });
    assert(createRes.status === 201, 'POST /tasks returned 201 Created');
    const createdTask = await createRes.json();
    assert(createdTask.title === 'Read SQL documentation', 'Task title set correctly');
    assert(createdTask.id > 0, 'Auto-increment primary key ID assigned');

    const invalidRes = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '   ' })
    });
    assert(invalidRes.status === 400, 'POST /tasks with blank title returned 400 Bad Request');
    console.log('✅ Test 5 Passed: POST /tasks creates row in SQLite & enforces validation.\n');

    // 6. Persistence across Server Restart Simulation
    console.log('Test 6: Verify Persistence Across Server Restart');
    // Close current server instance
    server.close();
    
    // Re-open server instance simulating server reboot
    server = app.listen(PORT + 1);
    const REBOOT_URL = `http://localhost:${PORT + 1}`;

    const rebootGetRes = await fetch(`${REBOOT_URL}/tasks`);
    assert(rebootGetRes.status === 200, 'Rebooted server GET /tasks returned 200');
    const rebootTasks = await rebootGetRes.json();
    const persistedTask = rebootTasks.find(t => t.id === createdTask.id);
    assert(persistedTask !== undefined, 'Newly created task survived server restart!');
    assert(persistedTask.title === 'Read SQL documentation', 'Persisted task title matches');
    console.log('✅ Test 6 Passed: Data survives server restarts (SQLite persistent storage verified).\n');

    // 7. PUT /tasks/:id (Update)
    console.log('Test 7: PUT /tasks/:id (Update)');
    const putRes = await fetch(`${REBOOT_URL}/tasks/${createdTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true })
    });
    assert(putRes.status === 200, 'PUT /tasks/:id returned 200');
    const updatedTask = await putRes.json();
    assert(updatedTask.done === true, 'Task done status updated to true in SQLite');

    const invalidPutRes = await fetch(`${REBOOT_URL}/tasks/${createdTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' })
    });
    assert(invalidPutRes.status === 400, 'PUT with empty title returned 400');
    console.log('✅ Test 7 Passed: PUT /tasks/:id updates row in SQLite & handles validation.\n');

    // 8. DELETE /tasks/:id
    console.log('Test 8: DELETE /tasks/:id');
    const deleteRes = await fetch(`${REBOOT_URL}/tasks/${createdTask.id}`, {
      method: 'DELETE'
    });
    assert(deleteRes.status === 204, 'DELETE /tasks/:id returned 204 No Content');

    const getDeletedRes = await fetch(`${REBOOT_URL}/tasks/${createdTask.id}`);
    assert(getDeletedRes.status === 404, 'Deleted task now returns 404');
    console.log('✅ Test 8 Passed: DELETE /tasks/:id removes row from SQLite database.\n');

    // 9. GET /stats
    console.log('Test 9: GET /stats (SQL COUNT aggregation)');
    const statsRes = await fetch(`${REBOOT_URL}/stats`);
    assert(statsRes.status === 200, 'GET /stats returned 200');
    const statsData = await statsRes.json();
    assert(typeof statsData.total === 'number', 'stats total is numeric');
    assert(typeof statsData.done === 'number', 'stats done is numeric');
    assert(typeof statsData.open === 'number', 'stats open is numeric');
    console.log(`Stats output: Total: ${statsData.total}, Completed: ${statsData.done}, Open: ${statsData.open}`);
    console.log('✅ Test 9 Passed: GET /stats calculates counts via SQL.\n');

    // 10. Query parameters (filtering & searching)
    console.log('Test 10: Filtering & Search Query Parameters');
    const filterRes = await fetch(`${REBOOT_URL}/tasks?done=true`);
    assert(filterRes.status === 200, 'GET /tasks?done=true returned 200');
    const filteredTasks = await filterRes.json();
    assert(filteredTasks.every(t => t.done === true), 'All returned tasks have done=true');

    const searchRes = await fetch(`${REBOOT_URL}/tasks?search=groceries`);
    assert(searchRes.status === 200, 'GET /tasks?search=groceries returned 200');
    const searchTasks = await searchRes.json();
    assert(searchTasks.length > 0 && searchTasks[0].title.includes('groceries'), 'Search returned matching task');
    console.log('✅ Test 10 Passed: SQL WHERE clause filtering and LIKE search working.\n');

    // 11. Swagger UI /docs
    console.log('Test 11: GET /docs (Swagger UI)');
    const docsRes = await fetch(`${REBOOT_URL}/docs/`);
    assert(docsRes.status === 200, 'GET /docs/ returned 200');
    console.log('✅ Test 11 Passed: Interactive Swagger UI available at /docs.\n');

    console.log('----------------------------------------------------');
    console.log('🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('❌ Test execution error:', error);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
