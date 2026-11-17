// Entry program for the make.fun frontend bounty.
//
// What it does: it gathers the two folders that make up the entry — app/
// (the static frontend) and screenshots/ (three renders of it running on
// live make.fun data) — copies them into the output directory, then asks
// the vendored make.fun library to summarise them into dossier.json, the
// sheet the judge reads. The output directory defaults to /output, the
// grader's writable directory; outside the grader, set
// MAKEFUN_OUTPUT_DIR to point it somewhere else, e.g.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program runs on Node 22 with the standard library only, makes no
// network calls, and writes the same bytes on every run: the copy is a
// plain recursive copy and the dossier is a pure function of the files
// it is handed.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The repository root is the directory this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from a clean slate for the two copied folders, then copy them in.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Caps from the gate: the dossier text is capped at 160 KiB, at most three
// screenshots of at most 256 KiB each, app/ at most 993 files and
// directories totalling at most 16 MiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
