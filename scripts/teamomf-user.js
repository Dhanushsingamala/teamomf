#!/usr/bin/env node
/*
 * Launcher for the TEAMOMF user provisioning CLI.
 *
 * The CLI itself is TypeScript inside the teamomf-credentials-backend plugin,
 * so that it shares the *exact* password hashing and storage code the backend
 * uses. There is no ts-node in this repo, so we bundle it on the fly with the
 * esbuild that @backstage/cli already depends on. Runtime dependencies stay
 * external so the installed versions are used.
 */
const fs = require('fs');
const path = require('path');
const { build } = require('esbuild');

const repoRoot = path.resolve(__dirname, '..');
const entryPoint = path.join(
  repoRoot,
  'plugins/teamomf-credentials-backend/src/cli/main.ts',
);
const outDir = path.join(repoRoot, 'node_modules/.cache/teamomf');
const outFile = path.join(outDir, 'teamomf-user.cjs');

async function run() {
  if (!fs.existsSync(entryPoint)) {
    throw new Error(`CLI entry point not found: ${entryPoint}`);
  }
  fs.mkdirSync(outDir, { recursive: true });

  await build({
    entryPoints: [entryPoint],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    packages: 'external',
    logLevel: 'warning',
  });

  process.env.TEAMOMF_REPO_ROOT = repoRoot;
  const { main } = require(outFile);
  await main(process.argv.slice(2));
}

run().catch(error => {
  process.stderr.write(`\n${error.stack || error.message}\n\n`);
  process.exit(1);
});
