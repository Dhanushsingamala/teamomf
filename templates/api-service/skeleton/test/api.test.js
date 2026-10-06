'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function withServer(run) {
  const server = createApp().listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(path => fetch(`${base}${path}`));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('health reports the service as healthy', async () => {
  await withServer(async get => {
    const res = await get('/health');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'healthy');
  });
});

test('serves its own OpenAPI document', async () => {
  await withServer(async get => {
    const res = await get('/openapi.yaml');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /yaml/);
    assert.match(await res.text(), /openapi: 3\.0\.3/);
  });
});

test('the collection starts empty', async () => {
  await withServer(async get => {
    const res = await get('/${{ values.resource }}');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.items, []);
    assert.equal(body.total, 0);
  });
});
