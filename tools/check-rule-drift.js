#!/usr/bin/env node
/**
 * Drift detector for Hayat MCP rules.
 *
 * Verifies that all Hayat ABAP development rules and coding standards live
 * in the central MCP server (resources/) — NOT in local Claude agent memory
 * or other gitignored locations.
 *
 * Run before commit/deploy to ensure deploy-readiness:
 *   npm run check:rule-drift
 *
 * Exits 0 on clean state, 1 on drift detected.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const REPO_ROOT = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

// ---------------------------------------------------------------------------
// 1. Local Claude agent memory must contain only MEMORY.md (pointer to MCP)
// ---------------------------------------------------------------------------
// Claude Code encodes project absolute paths into its memory directory name
// by replacing every non-alphanumeric character with '-'.
const projectEncoded = REPO_ROOT.replace(/[^a-zA-Z0-9]/g, '-');
const memDir = path.join(
  os.homedir(),
  '.claude',
  'projects',
  projectEncoded,
  'memory',
);

if (fs.existsSync(memDir)) {
  const files = fs
    .readdirSync(memDir)
    .filter((f) => f !== 'MEMORY.md' && !f.startsWith('.'));
  if (files.length > 0) {
    errors.push(
      `Local agent memory drift detected at:\n` +
        `  ${memDir}\n` +
        `  Found rule files: ${files.join(', ')}\n` +
        `  → Move content into resources/global.md or resources/hayat_<system>.md and delete the local copy.`,
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Required rule files must exist
// ---------------------------------------------------------------------------
const required = [
  'resources/global.md',
  'resources/hayat_s4d.md',
  'resources/hayat_hhd.md',
  'resources/hayat_hrd.md',
];
for (const rel of required) {
  const abs = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing required rule file: ${rel}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Deploy config must propagate resources/ into the Docker image
// ---------------------------------------------------------------------------
const dockerignorePath = path.join(REPO_ROOT, '.dockerignore');
if (fs.existsSync(dockerignorePath)) {
  const di = fs.readFileSync(dockerignorePath, 'utf-8');
  if (!di.includes('!resources/**/*.md')) {
    errors.push(
      `.dockerignore missing rule re-include: !resources/**/*.md\n` +
        `  Without this, *.md exclusion strips rule files from the build context.`,
    );
  }
}

const dockerfilePath = path.join(REPO_ROOT, 'docker', 'Dockerfile');
if (fs.existsSync(dockerfilePath)) {
  const df = fs.readFileSync(dockerfilePath, 'utf-8');
  if (!/COPY\s+--from=builder\s+\/app\/resources/.test(df)) {
    errors.push(
      `docker/Dockerfile runtime stage missing:\n` +
        `  COPY --from=builder /app/resources ./resources`,
    );
  }
}

const pkgPath = path.join(REPO_ROOT, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  if (!Array.isArray(pkg.files) || !pkg.files.includes('resources/')) {
    errors.push(`package.json "files" array missing "resources/"`);
  }
}

// ---------------------------------------------------------------------------
// 4. CLAUDE.md must point to resources/global.md (single source of truth)
// ---------------------------------------------------------------------------
const claudeMdPath = path.join(REPO_ROOT, 'CLAUDE.md');
if (fs.existsSync(claudeMdPath)) {
  const cm = fs.readFileSync(claudeMdPath, 'utf-8');
  if (cm.includes('docs/agent-rules/global.md')) {
    errors.push(
      `CLAUDE.md still references docs/agent-rules/global.md — update to resources/global.md`,
    );
  }
}

const oldMirrorPath = path.join(REPO_ROOT, 'docs', 'agent-rules', 'global.md');
if (fs.existsSync(oldMirrorPath)) {
  errors.push(
    `Mirror file present: docs/agent-rules/global.md\n` +
      `  → Delete it; resources/global.md is canonical.`,
  );
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
if (errors.length === 0 && warnings.length === 0) {
  console.log(
    '✓ No drift detected. All Hayat ABAP rules are centralized in resources/ and deploy-ready.',
  );
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.error('✗ Drift errors:');
    for (const e of errors) {
      console.error('  - ' + e.replace(/\n/g, '\n    '));
    }
  }
  if (warnings.length > 0) {
    console.warn('⚠ Warnings:');
    for (const w of warnings) {
      console.warn('  - ' + w.replace(/\n/g, '\n    '));
    }
  }
  process.exit(errors.length > 0 ? 1 : 0);
}
