#!/usr/bin/env node
/*
 * ZMCP_ADT_CL01 WebSocket dispatcher test client.
 *
 * Connects to ws://hrdev1.hayat.com.tr:8000/sap/bc/apc/sap/zmcp_adt
 * and invokes ZMCP_ADT_CL01=>call_rfc through the on_message handler.
 *
 * Wire protocol (request):
 *   { "fm_name": "<FM_NAME>", "params": "<inner JSON string>" }
 *
 * Wire protocol (response):
 *   { "success": "X"|"", "message": "...", "result": "<inner JSON string>",
 *     "log": [ { "type":"S|E|W|I", "message":"...", ... } ] }
 *
 * Usage:
 *   npm install --no-save ws dotenv
 *   node tools/test-zmcp-adt-ws.js                 # default: create ZTEST_DOM_001
 *   node tools/test-zmcp-adt-ws.js ping            # RFC_PING smoke test
 *   node tools/test-zmcp-adt-ws.js stfc            # STFC_CONNECTION echo test
 */

require('dotenv').config({ path: 'hr.env' });
const WebSocket = require('ws');

const SAP_URL = process.env.SAP_URL || 'http://hrdev1.hayat.com.tr:8000';
const USER = process.env.SAP_USERNAME;
const PASS = process.env.SAP_PASSWORD;
const CLIENT = process.env.SAP_CLIENT || '500';
const LANG = process.env.SAP_LANGUAGE || 'EN';

const wsUrl =
  SAP_URL.replace(/^http(s?):\/\//, (_, s) => (s ? 'wss://' : 'ws://')) +
  `/sap/bc/apc/sap/zmcp_adt?sap-client=${CLIENT}&sap-language=${LANG}`;

const auth = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

const scenario = process.argv[2] || 'ddic';

function buildRequest(scenario) {
  switch (scenario) {
    case 'ping':
      return { fm_name: 'RFC_PING', params: '{}' };
    case 'stfc':
      return {
        fm_name: 'STFC_CONNECTION',
        params: JSON.stringify({ REQUTEXT: 'hello from ws client' }),
      };
    case 'struct': {
      const strSpec = {
        description: 'MCP-ADT ws test structure',
        fields: [
          { fieldname: 'PACKAGE1',     rollname: 'DEVCLASS', keyflag: '', notnull: '' },
          { fieldname: 'TRANSPORT1',   rollname: 'TRKORR',   keyflag: '', notnull: '' },
          { fieldname: 'DESCRIPTION1', rollname: 'AS4TEXT',  keyflag: '', notnull: '' },
        ],
      };
      return {
        fm_name: 'Z_HAYAT_DDIC_CREATE',
        params: JSON.stringify({
          IV_OBJECT_TYPE: 'STRUCTURE',
          IV_OBJECT_NAME: 'ZTEST_STR_001',
          IV_PACKAGE: '$TMP',
          IV_TRANSPORT: '',
          IV_SPEC_JSON: JSON.stringify(strSpec),
          IV_ACTIVATE: 'X',
        }),
      };
    }
    case 'tab': {
      const tabSpec = {
        description: 'MCP-ADT ws test transparent table',
        delivery_class: 'A',          // A = Application table
        data_maintenance: 'X',        // X = Display/Maintenance Allowed
        fields: [
          { fieldname: 'MANDT', rollname: 'MANDT', keyflag: 'X', notnull: 'X' },
        ],
        includes: [
          { structure: 'ZTEST_STR_001', suffix: '' },
        ],
      };
      return {
        fm_name: 'Z_HAYAT_DDIC_CREATE',
        params: JSON.stringify({
          IV_OBJECT_TYPE: 'TABLE',
          IV_OBJECT_NAME: 'ZTEST_TAB_001',
          IV_PACKAGE: '$TMP',
          IV_TRANSPORT: '',
          IV_SPEC_JSON: JSON.stringify(tabSpec),
          IV_ACTIVATE: 'X',
        }),
      };
    }
    case 'tt': {
      const ttSpec = {
        description: 'MCP-ADT ws test table type',
        rowtype: 'ZTEST_STR_001',
        rowkind: 'S',          // S = structure ref (mirrors BAPIRETTAB)
        accessmode: 'T',       // T = standard table
        keykind: 'N',          // N = non-unique (mirrors BAPIRETTAB KEYDEF='D'+KEYKIND='N')
      };
      return {
        fm_name: 'Z_HAYAT_DDIC_CREATE',
        params: JSON.stringify({
          IV_OBJECT_TYPE: 'TTYP',
          IV_OBJECT_NAME: 'ZTEST_TT_001',
          IV_PACKAGE: '$TMP',
          IV_TRANSPORT: '',
          IV_SPEC_JSON: JSON.stringify(ttSpec),
          IV_ACTIVATE: 'X',
        }),
      };
    }
    case 'ddic':
    default: {
      const domSpec = {
        datatype: 'CHAR',
        leng: 10,
        outputlen: 10,
        description: 'MCP-ADT ws test domain',
      };
      return {
        fm_name: 'Z_HAYAT_DDIC_CREATE',
        params: JSON.stringify({
          IV_OBJECT_TYPE: 'DOMAIN',
          IV_OBJECT_NAME: 'ZTEST_DOM_001',
          IV_PACKAGE: '$TMP',
          IV_TRANSPORT: '',
          IV_SPEC_JSON: JSON.stringify(domSpec),
          IV_ACTIVATE: 'X',
        }),
      };
    }
  }
}

const request = buildRequest(scenario);
console.log(`[ws] connecting to ${wsUrl}`);
console.log(`[ws] scenario: ${scenario}`);
console.log(`[ws] request: ${JSON.stringify(request, null, 2)}`);

const ws = new WebSocket(wsUrl, {
  headers: { Authorization: auth },
  rejectUnauthorized: false,
});

const t0 = Date.now();

ws.on('open', () => {
  console.log(`[ws] open (${Date.now() - t0} ms) — sending request`);
  ws.send(JSON.stringify(request));
});

ws.on('message', (data) => {
  const text = data.toString('utf8');
  console.log(`[ws] message (${Date.now() - t0} ms):`);
  try {
    const obj = JSON.parse(text);
    console.log(JSON.stringify(obj, null, 2));
    if (obj.result && typeof obj.result === 'string') {
      try {
        console.log('\n[ws] decoded result:');
        console.log(JSON.stringify(JSON.parse(obj.result), null, 2));
      } catch (_) {}
    }
  } catch {
    console.log(text);
  }
  ws.close();
});

ws.on('error', (err) => {
  console.error(`[ws] error: ${err.message}`);
  process.exitCode = 1;
});

ws.on('close', (code, reason) => {
  console.log(`[ws] close (${Date.now() - t0} ms) code=${code} reason=${reason || ''}`);
});

setTimeout(() => {
  console.error('[ws] timeout (30s)');
  ws.terminate();
  process.exitCode = 2;
}, 30_000);
