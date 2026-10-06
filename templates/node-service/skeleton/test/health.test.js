'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

/** Starts the app on an ephemeral port and returns a fetch helper. */
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
    const body = await res.json();
    assert.equal(body.status, 'healthy');
    assert.equal(body.service, '${{ values.name }}');
  });
});

test('unknown routes return a structured 404', async () => {
  await withServer(async get => {
    const res = await get('/does-not-exist');
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, 'NOT_FOUND');
  });
});
