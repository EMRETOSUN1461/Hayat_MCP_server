#!/usr/bin/env node
/**
 * Teknik Şartname Analiz Scripti
 *
 * Kullanım:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/analyze-ts.mjs <dosya.xlsx>
 *
 * Dökümanı parse edip Claude API'ye gönderir, HAZIR/HAZIR_DEGIL analizi alır.
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ─── Argüman kontrolü ────────────────────────────────────────────────────────
const xlsxPath = process.argv[2];
if (!xlsxPath) {
  console.error('Kullanım: node scripts/analyze-ts.mjs <dosya.xlsx>');
  process.exit(1);
}
if (!fs.existsSync(xlsxPath)) {
  console.error(`Dosya bulunamadı: ${xlsxPath}`);
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY environment variable ayarlanmamış.');
  process.exit(1);
}

// ─── System prompt'u oku (BÖLÜM 2 öncesi kısım) ─────────────────────────────
const promptFilePath = path.join(projectRoot, 'resources', 'ts-analysis-prompt.md');
const promptFileContent = fs.readFileSync(promptFilePath, 'utf-8');
const systemPrompt = promptFileContent
  .split('## BÖLÜM 2:')[0]
  .replace(/^# Teknik Şartname Analiz Promptu[\s\S]*?---\n/m, '')
  .replace(/## BÖLÜM 1: SYSTEM PROMPT[\s\S]*?---\n/m, '')
  .trim();

// ─── Parser'ı yükle ──────────────────────────────────────────────────────────
const distParser = path.join(projectRoot, 'dist', 'lib', 'ts', 'xlsxParser.js');
let parseTSXlsx;
try {
  const m = await import(pathToFileURL(distParser).href);
  parseTSXlsx = m.parseTSXlsx;
} catch {
  console.error('dist/ bulunamadı. Önce `npm run build` çalıştırın.');
  process.exit(2);
}

// ─── XLSX'i parse et ─────────────────────────────────────────────────────────
console.log(`\nParsing: ${xlsxPath}`);
const parsed = await parseTSXlsx(xlsxPath);

// ─── User message oluştur ────────────────────────────────────────────────────
function buildUserMessage(r) {
  const gi = r.generalInfo ?? {};
  const objects = (r.abapObjects ?? [])
    .map(o => `- [${o.devId}] ${o.type} | ${o.category} | Ad: ${o.name} | ${o.description || ''}`)
    .join('\n') || '(yok)';

  const isMantigi = (r.isMantigi ?? [])
    .map((b, i) => `#### Blok ${i + 1}: ${b.header}\n${b.content}${b.codeSnippet ? `\n\nKod:\n\`\`\`abap\n${b.codeSnippet}\n\`\`\`` : ''}`)
    .join('\n\n') || '(yok)';

  const ddic = (r.ddicAlanlari ?? [])
    .map(b => `**${b.kind} ${b.name}**\n${(b.fields ?? []).map(f => `  - ${f.name} | ${f.dataElement || '?'} | ${f.isKey ? 'KEY' : ''} ${f.currQuantRef || ''}`).join('\n')}`)
    .join('\n\n') || '(yok)';

  const cds = r.cdsView?.name
    ? JSON.stringify(r.cdsView, null, 2)
    : '(yok)';

  const sinifFm = (r.sinifFm ?? [])
    .map(b => `**${b.kind} ${b.parentName || ''} → ${b.memberName}**\n${b.rawText || ''}`)
    .join('\n\n') || '(yok)';

  const programEkrani = r.programEkrani
    ? `Program: ${r.programEkrani.program?.name || '?'}\nSelection screen alanları: ${r.programEkrani.selectionScreen?.length ?? 0}\nALV alanları: ${r.programEkrani.alvLayout?.fields?.length ?? 0}\nALV butonları: ${r.programEkrani.alvButtons?.length ?? 0}`
    : '(yok)';

  const standart = (r.standartCagrilar ?? [])
    .map(s => `- ${s.standardObjectName} | ${s.calledFrom} | ${s.purpose} | ${s.criticalParameters}`)
    .join('\n') || '(yok)';

  const testler = (r.testSenaryolari ?? [])
    .map(t => `- [${t.testId}] ${t.scenario} | Input: ${t.input} | Beklenen: ${t.expectedOutput}`)
    .join('\n') || '(yok)';

  const parseIssues = (r.parseIssues ?? [])
    .map(i => `- [${i.severity}] ${i.message}`)
    .join('\n') || 'Sorun yok';

  return `## Teknik Şartname İçeriği

### Genel Bilgiler
- Talep Başlığı: ${gi.title || '(belirtilmemiş)'}
- Talep Açıklaması: ${gi.description || '(belirtilmemiş)'}
- Geliştirme Tipi: ${gi.devType || '(belirtilmemiş)'}
- Modül: ${gi.module || '(belirtilmemiş)'}
- Fonksiyonel Danışman: ${gi.functionalConsultant || '(belirtilmemiş)'}
- ITJWM No: ${gi.itjwmNo || '(belirtilmemiş)'}
- Paket: ${gi.package || '(belirtilmemiş)'}
- System ID: ${gi.systemId || '(belirtilmemiş)'}
- TS No/Versiyon: ${gi.tsNoVersion || '(belirtilmemiş)'}

### Nesneler
${objects}

### İş Mantığı Blokları
${isMantigi}

### DDIC Alanları
${ddic}

### CDS View Bilgileri
${cds}

### Sınıf / FM Tanımları
${sinifFm}

### Program / Ekran Bilgileri
${programEkrani}

### Standart Çağrılar
${standart}

### Test Senaryoları
${testler}

### Parse Sorunları
${parseIssues}`;
}

const userMessage = buildUserMessage(parsed);

// ─── Claude API çağrısı ──────────────────────────────────────────────────────
console.log('Claude API\'ye gönderiliyor...\n');
const client = new Anthropic();

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: systemPrompt,
  messages: [{ role: 'user', content: userMessage }],
});

const rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';
const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

// ─── Sonucu göster ───────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════');
console.log('              ANALİZ SONUCU');
console.log('═══════════════════════════════════════════════════════\n');

try {
  const result = JSON.parse(jsonText);
  const karar = result.karar === 'HAZIR' ? '✅ HAZIR' : '❌ HAZIR DEĞİL';
  console.log(`Karar        : ${karar}`);
  console.log(`Geliştirme   : ${result.gelistirme_tipi}`);
  console.log(`Onay Durumu  : ${result.onay_durumu}\n`);

  if (result.tamamlanan_kisimlar?.length) {
    console.log('✔ Tamamlanan Kısımlar:');
    result.tamamlanan_kisimlar.forEach(x => console.log(`  • ${x}`));
    console.log();
  }

  if (result.eksik_bilgiler?.length) {
    console.log('✘ Eksik Bilgiler:');
    result.eksik_bilgiler.forEach(x => console.log(`  • ${x}`));
    console.log();
  }

  if (result.analistten_sorulacaklar?.length) {
    console.log('? Analistten Sorulacaklar:');
    result.analistten_sorulacaklar.forEach(x => console.log(`  • ${x}`));
    console.log();
  }

  if (result.risk_notu) {
    console.log(`⚠ Risk Notu: ${result.risk_notu}`);
  }

  console.log('\n--- Ham JSON ---');
  console.log(JSON.stringify(result, null, 2));
} catch {
  console.log('JSON parse hatası. Ham yanıt:');
  console.log(rawText);
}
