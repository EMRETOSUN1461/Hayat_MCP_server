/**
 * Shared utility for executing ABAP programs and reading results from ZAI_MCP_OUTPUT.
 * Used by Adobe Form tools and other handlers that need to run generated ABAP code.
 */

import { AdtExecutor } from '@mcp-abap-adt/adt-clients';
import { createAdtClient } from '../../lib/clients';
import type { HandlerContext } from '../../lib/handlers/interfaces';
import { parseSqlQueryXml } from '../system/readonly/handleGetSqlQuery';

const CALLER_PROGRAM = 'ZAI_MCP_FM_CALLER';

/**
 * Generate a unique execution ID
 */
export function generateExecId(): string {
  return `MCP_${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Generate ABAP code to write a result string to ZAI_MCP_OUTPUT table.
 * Splits long strings into 255-char chunks.
 * sourceVar can be a variable name or a literal (e.g., 'SUCCESS').
 * Literals are first assigned to lv_src_tmp to avoid ABAP offset syntax issues.
 */
export function abapWriteOutput(
  execId: string,
  paramName: string,
  sourceVar: string,
): string {
  const lines: string[] = [];
  lines.push(`* Write ${paramName} to output`);
  // Always copy source to temp variable — ABAP offset syntax doesn't work on literals
  lines.push(`lv_src_tmp = ${sourceVar}.`);
  lines.push(`lv_seq = lv_seq + 1.`);
  lines.push(`ls_output-exec_id = '${execId}'.`);
  lines.push(`ls_output-seq_nr = lv_seq.`);
  lines.push(`ls_output-line = '@@PARAM:${paramName}'.`);
  lines.push(`INSERT zai_mcp_output FROM ls_output.`);
  lines.push(`lv_len = strlen( lv_src_tmp ).`);
  lines.push(`lv_offset = 0.`);
  lines.push(`WHILE lv_offset < lv_len.`);
  lines.push(`  lv_seq = lv_seq + 1.`);
  lines.push(`  IF lv_len - lv_offset > 255.`);
  lines.push(`    lv_chunk = lv_src_tmp+lv_offset(255).`);
  lines.push(`  ELSE.`);
  lines.push(`    lv_remaining = lv_len - lv_offset.`);
  lines.push(`    lv_chunk = lv_src_tmp+lv_offset(lv_remaining).`);
  lines.push(`  ENDIF.`);
  lines.push(`  ls_output-seq_nr = lv_seq.`);
  lines.push(`  ls_output-line = lv_chunk.`);
  lines.push(`  INSERT zai_mcp_output FROM ls_output.`);
  lines.push(`  lv_offset = lv_offset + 255.`);
  lines.push(`ENDWHILE.`);
  lines.push('');
  return lines.join('\n');
}

/**
 * Generate ABAP code to assign a long string to a variable.
 * Splits the string into ~200-char chunks using CONCATENATE to stay within
 * the 255-char ABAP source line limit.
 *
 * @param targetVar - ABAP variable name (TYPE string) to assign into
 * @param value - The raw string value (will be single-quote escaped)
 * @returns ABAP code lines that build up targetVar
 */
export function abapAssignLongString(targetVar: string, value: string): string {
  const escaped = value.replace(/'/g, "''");
  // Max line = 255 chars. CONCATENATE overhead ~70 chars, so chunk ≤ 180
  const chunkSize = 180;
  const lines: string[] = [];
  lines.push(`${targetVar} = ''.`);
  for (let i = 0; i < escaped.length; i += chunkSize) {
    const chunk = escaped.substring(i, i + chunkSize);
    lines.push(
      `CONCATENATE ${targetVar} '${chunk}' INTO ${targetVar} RESPECTING BLANKS.`,
    );
  }
  return lines.join('\n');
}

/**
 * Standard ABAP declarations for output handling
 */
export function abapOutputDeclarations(): string {
  return [
    'DATA lv_json TYPE string.',
    'DATA lv_msg TYPE string.',
    'DATA lv_len TYPE i.',
    'DATA lv_offset TYPE i.',
    'DATA lv_remaining TYPE i.',
    'DATA lv_chunk TYPE c LENGTH 255.',
    'DATA lv_src_tmp TYPE string.',
    'DATA ls_output TYPE zai_mcp_output.',
    'DATA lv_seq TYPE n LENGTH 4.',
  ].join('\n');
}

/**
 * Execute an ABAP program source code and read results from ZAI_MCP_OUTPUT.
 *
 * @returns Map of param names to their string values
 */
export async function executeAbapAndReadOutput(
  context: HandlerContext,
  sourceCode: string,
  execId: string,
  description: string,
): Promise<Record<string, string>> {
  const { connection, logger } = context;
  const client = createAdtClient(connection, logger);

  // 1. Update caller program
  let lockHandle: string | undefined;
  try {
    lockHandle = await client.getProgram().lock({
      programName: CALLER_PROGRAM,
    });
    await client.getProgram().update(
      {
        programName: CALLER_PROGRAM,
        sourceCode,
      },
      { lockHandle },
    );
  } finally {
    if (lockHandle) {
      try {
        await client
          .getProgram()
          .unlock({ programName: CALLER_PROGRAM }, lockHandle);
      } catch {
        // ignore
      }
    }
  }
  await client.getProgram().activate({ programName: CALLER_PROGRAM });

  logger?.info?.(`Caller program activated, executing: ${description}`);

  // 2. Run the program
  const executor = new AdtExecutor(connection, logger);
  const programExecutor = executor.getProgramExecutor();
  const runResult = await programExecutor.runWithProfiling(
    { programName: CALLER_PROGRAM },
    { profilerParameters: { description } },
  );

  if (runResult.response?.status !== 200) {
    throw new Error(
      `Program execution failed with status ${runResult.response?.status}`,
    );
  }

  logger?.info?.('Program executed, reading output...');

  // 3. Query results from ZAI_MCP_OUTPUT
  const sqlResponse = await client.getUtils().getSqlQuery({
    sql_query: `SELECT * FROM zai_mcp_output WHERE exec_id = '${execId}' ORDER BY seq_nr`,
    row_number: 9999,
  });

  // 4. Parse and reconstruct results
  const results: Record<string, string> = {};
  let currentParam = '';
  let currentValue = '';

  const rawXml = typeof sqlResponse?.data === 'string' ? sqlResponse.data : '';
  const parsed = parseSqlQueryXml(
    rawXml,
    'SELECT FROM zai_mcp_output',
    9999,
    logger ?? undefined,
  );

  for (const row of parsed.rows) {
    const line = (row.LINE || '').trim();
    if (line.startsWith('@@PARAM:')) {
      if (currentParam && currentValue) {
        results[currentParam] = currentValue;
      }
      currentParam = line.replace('@@PARAM:', '');
      currentValue = '';
    } else {
      currentValue += line;
    }
  }

  if (currentParam && currentValue) {
    results[currentParam] = currentValue;
  }

  return results;
}
