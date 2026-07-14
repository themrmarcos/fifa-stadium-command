/**
 * E2E REST API Integration Test Suite
 * Run: node tests/api.test.js
 */

const BASE_URL = 'http://localhost:8000';

async function runTests() {
  console.log('==================================================');
  console.log(' Starting E2E REST API Integration Test Suite    ');
  console.log(` Target Server: ${BASE_URL}                        `);
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  async function assert(name, conditionFn) {
    try {
      const result = await conditionFn();
      if (result) {
        console.log(`✅ PASS: ${name}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${name} (Assertion returned false)`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ FAIL: ${name} (Threw exception: ${err.message})`);
      failed++;
    }
  }

  // 1. GET /api/matches
  await assert('GET /api/matches - Retrieve Matches list', async () => {
    const res = await fetch(`${BASE_URL}/api/matches`);
    if (res.status !== 200) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length >= 4 && data[0].team1 !== undefined;
  });

  // 2. GET /api/tickets
  await assert('GET /api/tickets - Retrieve scan tickets list', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets`);
    if (res.status !== 200) return false;
    const data = await res.json();
    return Array.isArray(data);
  });

  // 3. POST /api/bookings & Verify Seat Decrement
  let testSerial = '';
  await assert('POST /api/bookings - Book Category 1 Seat', async () => {
    // Fetch current seats left for Match 1
    const matchesResBefore = await fetch(`${BASE_URL}/api/matches`);
    const matchesBefore = await matchesResBefore.json();
    const match1Before = matchesBefore.find(m => m.id === 'm1');
    const seatsBefore = match1Before.ticketsLeft;

    // Post booking
    const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: 'm1',
        holder: 'Jane Doe',
        level: 'Category 1',
        catNum: 1,
        sec: 'East 104',
        row: 5,
        seat: 12
      })
    });

    if (bookRes.status !== 201) return false;
    const ticket = await bookRes.json();
    testSerial = ticket.serial;

    // Fetch seats after
    const matchesResAfter = await fetch(`${BASE_URL}/api/matches`);
    const matchesAfter = await matchesResAfter.json();
    const match1After = matchesAfter.find(m => m.id === 'm1');
    const seatsAfter = match1After.ticketsLeft;

    return ticket.holder === 'Jane Doe' && (seatsBefore - seatsAfter === 1);
  });

  // 4. POST /api/tickets/verify (Success case)
  await assert('POST /api/tickets/verify - Verify valid serial', async () => {
    if (!testSerial) return false;
    const res = await fetch(`${BASE_URL}/api/tickets/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial: testSerial })
    });
    if (res.status !== 200) return false;
    const data = await res.json();
    return data.verified === true && data.ticket.holder === 'Jane Doe';
  });

  // 5. POST /api/tickets/verify (Failure case)
  await assert('POST /api/tickets/verify - Fail on invalid serial', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial: 'FIFA-INVALID-SERIAL' })
    });
    if (res.status !== 404) return false;
    const data = await res.json();
    return data.verified === false && data.error !== undefined;
  });

  // 6. POST /api/chat - RAG retriever search (bag policy)
  await assert('POST /api/chat - Retrieve RAG context bag policy', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is the bag policy?' })
    });
    if (res.status !== 200) return false;
    const data = await res.json();
    return data.response.toLowerCase().includes('bag') && data.response.toLowerCase().includes('clear');
  });

  // 7. GET /api/admin/incidents
  await assert('GET /api/admin/incidents - Retrieve incidents', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/incidents`);
    if (res.status !== 200) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  });

  // 8. POST /api/admin/incidents & Resolution Pipeline
  await assert('POST /api/admin/incidents & POST /api/admin/incidents/resolve - Dispatch & Resolve incident', async () => {
    // 1. Dispatch
    const dispatchRes = await fetch(`${BASE_URL}/api/admin/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sector: 'South',
        category: 'Medical',
        severity: 'HIGH',
        description: 'Test dispatcher medical alert.'
      })
    });
    if (dispatchRes.status !== 201) return false;
    const newInc = await dispatchRes.json();
    const incId = newInc.id;

    // 2. Verify in list
    const incidentsRes = await fetch(`${BASE_URL}/api/admin/incidents`);
    const list = await incidentsRes.json();
    const found = list.find(i => i.id === incId);
    if (!found || found.status !== 'ACTIVE') return false;

    // 3. Resolve
    const resolveRes = await fetch(`${BASE_URL}/api/admin/incidents/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: incId })
    });
    if (resolveRes.status !== 200) return false;

    // 4. Verify resolved status
    const incidentsRes2 = await fetch(`${BASE_URL}/api/admin/incidents`);
    const list2 = await incidentsRes2.json();
    const found2 = list2.find(i => i.id === incId);
    return found2.status === 'RESOLVED';
  });

  // 9. POST /api/admin/simulate
  await assert('POST /api/admin/simulate - Trigger congestion bottleneck simulation', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'congestion' })
    });
    if (res.status !== 201) return false;
    const data = await res.json();
    return data.category === 'Crowd Congestion' && data.status === 'ACTIVE';
  });

  console.log('\n==================================================');
  console.log(' Test Suite Results Summary                      ');
  console.log(` Total Passed: ${passed}                         `);
  console.log(` Total Failed: ${failed}                         `);
  console.log('==================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
