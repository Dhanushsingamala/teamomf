'use strict';

const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;
const server = createApp().listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`${{ values.name }} listening on port ${port}`);
});

/** Let in-flight requests finish before exiting. */
function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}, shutting down`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { server };
