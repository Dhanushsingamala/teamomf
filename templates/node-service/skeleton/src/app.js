'use strict';

const express = require('express');
const { version } = require('../package.json');

const SERVICE_NAME = '${{ values.name }}';

/**
 * Builds the Express application.
 *
 * Exported separately from the server so tests can mount it on an ephemeral
 * port without the process-level concerns in server.js.
 */
function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  app.get('/health', (req, res) => {
    res.status(200).json({
      service: SERVICE_NAME,
      status: 'healthy',
      version,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Unmatched routes get the same JSON error envelope as everything else.
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `No route matches ${req.method} ${req.path}`,
      },
    });
  });

  // Errors are logged server-side; clients never see internals.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled error while serving a request:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected internal error occurred',
      },
    });
  });

  return app;
}

module.exports = { createApp, SERVICE_NAME };
