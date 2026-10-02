/**
 * Unit Tests for PriorityQueue.js
 * Verifies core triage rules, tie-breaking, heap operations, and scenario tests.
 */

// If running in node/CLI
var PriorityQueueClass = (typeof PriorityQueue !== 'undefined') ? PriorityQueue : (typeof require !== 'undefined' ? require('../js/priorityQueue.js') : window.PriorityQueue);

function runTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      passed++;
      results.push({ name: testName, status: 'PASS', details });
      console.log(`✓ PASS: ${testName}`);
    } else {
      failed++;
      results.push({ name: testName, status: 'FAIL', details });
      console.error(`✗ FAIL: ${testName} - ${details}`);
    }
  }

  console.log("=== Running Priority Queue Tests ===");

  // Test 1: Empty queue behavior
  const pq = new PriorityQueueClass();
  assert(pq.isEmpty() === true, "New PQ is empty");
  assert(pq.size() === 0, "New PQ size is 0");
  assert(pq.peek() === null, "Peek on empty PQ returns null");
  assert(pq.dequeue() === null, "Dequeue on empty PQ returns null");

  // Test 2: Basic Priority Ordering
  pq.enqueue({ id: 'P1', name: 'John Doe', priority: 1, arrivalTime: '2026-10-02T10:00:00' });
  pq.enqueue({ id: 'P4', name: 'Alice Smith', priority: 4, arrivalTime: '2026-10-02T10:05:00' });
  pq.enqueue({ id: 'P2', name: 'Bob Jones', priority: 2, arrivalTime: '2026-10-02T10:02:00' });
  pq.enqueue({ id: 'P5', name: 'Critical Carl', priority: 5, arrivalTime: '2026-10-02T10:10:00' });
  pq.enqueue({ id: 'P3', name: 'David Lee', priority: 3, arrivalTime: '2026-10-02T10:01:00' });

  assert(pq.size() === 5, "PQ size is 5 after enqueuing 5 patients");
  assert(pq.peek().id === 'P5', "Peek returns Priority 5 (highest priority)");

  const order1 = [];
  while (!pq.isEmpty()) {
    order1.push(pq.dequeue().id);
  }
  assert(
    JSON.stringify(order1) === JSON.stringify(['P5', 'P4', 'P3', 'P2', 'P1']),
    "Patients dequeued in strictly descending priority order (P5 -> P4 -> P3 -> P2 -> P1)",
    `Got: ${order1.join(', ')}`
  );

  // Test 3: The Specification's Critical Scenario:
  // Patient A arrives at 10:00 with Priority 3.
  // Patient B arrives at 10:05 with Priority 5.
  // Patient C arrives at 09:55 with Priority 3.
  // The treatment order must be: Patient B -> Patient C -> Patient A
  pq.clear();
  const patientA = { id: 'P_A', name: 'Patient A', priority: 3, arrivalTime: '2026-10-02T10:00:00' };
  const patientB = { id: 'P_B', name: 'Patient B', priority: 5, arrivalTime: '2026-10-02T10:05:00' };
  const patientC = { id: 'P_C', name: 'Patient C', priority: 3, arrivalTime: '2026-10-02T09:55:00' };

  pq.enqueue(patientA);
  pq.enqueue(patientB);
  pq.enqueue(patientC);

  const scenarioOrder = pq.toArrayInOrder().map(p => p.id);
  assert(
    JSON.stringify(scenarioOrder) === JSON.stringify(['P_B', 'P_C', 'P_A']),
    "Specification Scenario: Patient B -> Patient C -> Patient A",
    `Expected ['P_B', 'P_C', 'P_A'], got: ${scenarioOrder.join(' -> ')}`
  );

  // Dequeue scenario verification
  const dequeuedScenario = [pq.dequeue().id, pq.dequeue().id, pq.dequeue().id];
  assert(
    JSON.stringify(dequeuedScenario) === JSON.stringify(['P_B', 'P_C', 'P_A']),
    "Dequeuing directly produces Patient B -> Patient C -> Patient A",
    `Got: ${dequeuedScenario.join(' -> ')}`
  );

  // Test 4: Same Priority, Multiple Arrival Times (FIFO tie-breaker)
  pq.clear();
  pq.enqueue({ id: 'P10', priority: 4, arrivalTime: '2026-10-02T08:30:00' });
  pq.enqueue({ id: 'P11', priority: 4, arrivalTime: '2026-10-02T08:15:00' });
  pq.enqueue({ id: 'P12', priority: 4, arrivalTime: '2026-10-02T08:45:00' });
  pq.enqueue({ id: 'P13', priority: 4, arrivalTime: '2026-10-02T08:00:00' });

  const fifoOrder = pq.toArrayInOrder().map(p => p.id);
  assert(
    JSON.stringify(fifoOrder) === JSON.stringify(['P13', 'P11', 'P10', 'P12']),
    "Equal priority items ordered strictly by arrival time (earliest first)",
    `Got: ${fifoOrder.join(', ')}`
  );

  // Test 5: Deterministic Tie-Breaker (Same Priority & Same Arrival Time)
  pq.clear();
  pq.enqueue({ id: 'P_Z', priority: 2, arrivalTime: '2026-10-02T12:00:00' });
  pq.enqueue({ id: 'P_M', priority: 2, arrivalTime: '2026-10-02T12:00:00' });
  pq.enqueue({ id: 'P_A', priority: 2, arrivalTime: '2026-10-02T12:00:00' });

  const tieOrder = pq.toArrayInOrder().map(p => p.id);
  assert(
    JSON.stringify(tieOrder) === JSON.stringify(['P_A', 'P_M', 'P_Z']),
    "Equal priority & arrival time tie-broken deterministically by Patient ID",
    `Got: ${tieOrder.join(', ')}`
  );

  // Test 6: Arbitrary Patient Removal
  pq.clear();
  pq.enqueue({ id: 'P1', priority: 5, arrivalTime: '2026-10-02T10:00:00' });
  pq.enqueue({ id: 'P2', priority: 4, arrivalTime: '2026-10-02T10:01:00' });
  pq.enqueue({ id: 'P3', priority: 3, arrivalTime: '2026-10-02T10:02:00' });
  pq.enqueue({ id: 'P4', priority: 2, arrivalTime: '2026-10-02T10:03:00' });

  const removed = pq.remove('P2');
  assert(removed && removed.id === 'P2', "Successfully removed arbitrary patient P2");
  assert(pq.size() === 3, "Size updated to 3 after removal");
  const remaining = pq.toArrayInOrder().map(p => p.id);
  assert(
    JSON.stringify(remaining) === JSON.stringify(['P1', 'P3', 'P4']),
    "Remaining elements maintain valid heap order after removal",
    `Got: ${remaining.join(', ')}`
  );

  // Test 7: Patient Priority Re-Triage (Update Priority in-place)
  pq.clear();
  pq.enqueue({ id: 'P1', priority: 2, arrivalTime: '2026-10-02T10:00:00' });
  pq.enqueue({ id: 'P2', priority: 3, arrivalTime: '2026-10-02T10:01:00' });
  pq.enqueue({ id: 'P3', priority: 1, arrivalTime: '2026-10-02T10:02:00' });

  // P1 deteriorates from Priority 2 to Priority 5 (Critical)!
  pq.update('P1', p => { p.priority = 5; });
  assert(pq.peek().id === 'P1', "Re-triaged patient P1 (now Priority 5) immediately bubbles up to top of queue");

  const retriageOrder = pq.toArrayInOrder().map(p => p.id);
  assert(
    JSON.stringify(retriageOrder) === JSON.stringify(['P1', 'P2', 'P3']),
    "Order after re-triage reflects new priority",
    `Got: ${retriageOrder.join(', ')}`
  );

  console.log(`\n=== Test Summary: ${passed} passed, ${failed} failed ===`);
  return { passed, failed, results };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests };
}
if (typeof window !== 'undefined') {
  window.runPQTests = runTests;
}
