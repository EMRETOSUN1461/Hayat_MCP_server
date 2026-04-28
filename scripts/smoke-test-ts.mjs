#!/usr/bin/env node
/**
 * Smoke test for TS parser + validator.
 * Compiles the TS modules on the fly via `tsx`? No — keep it simple: use
 * ts-node/register? Simplest path: require the .ts via `ts-node` OR pre-compile.
 *
 * Since the project uses plain tsc, we compile just the two files to a temp
 * location and require them. But that's heavy. Easier: use the already-built
 * `dist/` if available, otherwise fall back to tsx.
 *
 * Simplest: use `tsx` (already likely as a dev-dep of node). Try it.
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dynamic import with tsx loader
async function main() {
  // Try importing compiled output first
  const projectRoot = path.resolve(__dirname, '..');
  const distParser = path.join(projectRoot, 'dist', 'lib', 'ts', 'xlsxParser.js');
  const distValidator = path.join(projectRoot, 'dist', 'lib', 'ts', 'tsValidator.js');

  let parser, validator;
  try {
    parser = await import(pathToFileURL(distParser).href);
    validator = await import(pathToFileURL(distValidator).href);
  } catch (e) {
    console.error('dist/ not available — compile first with `npx tsc`.');
    console.error(e.message);
    process.exit(2);
  }

  const resourcesDir = path.join(projectRoot, 'resources');
  const files = [
    { label: 'ornek-simple', path: path.join(resourcesDir, 'ornek-simple.xlsx') },
    { label: 'ornek-complex', path: path.join(resourcesDir, 'ornek-complex.xlsx') },
    { label: 'ts-template (boş)', path: path.join(resourcesDir, 'ts-template.xlsx') },
  ];

  for (const f of files) {
    console.log('\n================================================================');
    console.log(' ', f.label, '  (', f.path, ')');
    console.log('================================================================');
    const parsed = await parser.parseTSXlsx(f.path);
    console.log('Present sheets:', parsed.presentSheets);
    console.log('GeneralInfo:', parsed.generalInfo);
    console.log('Nesneler rows:', parsed.abapObjects.length);
    for (const row of parsed.abapObjects) {
      console.log('   -', row.devId, '|', row.type, '|', row.category, '|', row.name);
    }
    console.log('Is_Mantigi blocks:', parsed.isMantigi.length);
    parsed.isMantigi.forEach((b, i) => {
      console.log(`   [${i}] ${b.header}  (content=${b.content.length} chars, code=${b.codeSnippet ? 'yes' : 'no'})`);
    });
    if (parsed.ddicAlanlari) {
      console.log('DDIC blocks:', parsed.ddicAlanlari.length);
      parsed.ddicAlanlari.forEach((b) => console.log('   -', b.kind, b.name, '| fields:', b.fields?.length ?? 0));
    }
    if (parsed.cdsView?.name) {
      console.log('CDS view:', parsed.cdsView.name, '(', parsed.cdsView.viewType, ')');
    }
    if (parsed.sinifFm) {
      console.log('Sinif_FM blocks:', parsed.sinifFm.length);
      parsed.sinifFm.forEach((b) => console.log('   -', b.kind, b.parentName || '-', '→', b.memberName));
    }
    if (parsed.programEkrani) {
      console.log('Program_Ekrani:',
        'program=', !!parsed.programEkrani.program,
        'selScreen fields=', parsed.programEkrani.selectionScreen?.length ?? 0,
        'ALV fields=', parsed.programEkrani.alvLayout?.fields.length ?? 0,
        'ALV buttons=', parsed.programEkrani.alvButtons?.length ?? 0);
    }
    if (parsed.standartCagrilar) console.log('Standart_Cagrilar rows:', parsed.standartCagrilar.length);
    if (parsed.testSenaryolari) console.log('Test_Senaryolari rows:', parsed.testSenaryolari.length);

    const issues = validator.validateTSStructure(parsed);
    const summary = validator.summariseIssues(issues);
    console.log('--- Validation ---');
    console.log('errors=', summary.errorCount, 'warnings=', summary.warningCount);
    for (const i of issues) {
      console.log(`   [${i.severity}] ${i.field}: ${i.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
