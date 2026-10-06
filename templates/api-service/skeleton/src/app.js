'use strict';

const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { version } = require('../package.json');

const SERVICE_NAME = '${{ values.name }}';
const OPENAPI_PATH = path.join(__dirname, '..', 'openapi.yaml');

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

  /** Serves the checked-in OpenAPI document verbatim. */
  app.get('/openapi.yaml', (req, res, next) => {
    fs.readFile(OPENAPI_PATH, 'utf8', (err, contents) => {
      if (err) {
        next(err);
        return;
      }
      res.type('application/yaml').status(200).send(contents);
    });
  });

  // TODO: replace this in-memory placeholder with your real data access.
  // It starts empty and only ever contains what a client actually created --
  // do not seed it with sample records.
  const ${{ values.resource }} = [];

  app.get('/${{ values.resource }}', (req, res) => {
    res.status(200).json({ items: ${{ values.resource }}, total: ${{ values.resource }}.length });
  });

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `No route matches ${req.method} ${req.path}`,
      },
    });
  });

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
