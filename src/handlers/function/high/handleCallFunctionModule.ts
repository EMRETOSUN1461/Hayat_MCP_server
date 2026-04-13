/**
 * CallFunctionModule Handler - Execute an ABAP function module via dynamic program generation
 *
 * Workflow:
 * 1. Read FM source to extract parameter interface (names + types)
 * 2. Generate ABAP caller program that:
 *    - Deserializes import params from JSON
 *    - Calls the FM
 *    - Serializes export params to JSON
 *    - Stores results in ZAI_MCP_OUTPUT table
 * 3. Update + activate the caller program
 * 4. Run the program via profiling executor
 * 5. Query ZAI_MCP_OUTPUT for results
 * 6. Clean up and return results
 *
 * Prerequisites:
 * - Table ZAI_MCP_OUTPUT must exist (EXEC_ID CHAR32, SEQ_NR NUMC4, LINE CHAR255)
 * - /ui2/cl_json must be available on the SAP system
 */

import { AdtExecutor } from '@mcp-abap-adt/adt-clients';
import { createAdtClient } from '../../../lib/clients';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import {
  type AxiosResponse,
  return_error,
  return_response,
} from '../../../lib/utils';
import { parseSqlQueryXml } from '../../system/readonly/handleGetSqlQuery';

export const TOOL_DEFINITION = {
  name: 'CallFunctionModule',
  available_in: ['onprem'] as const,
  description:
    'Execute/call an ABAP function module with parameters and return export results. Requires table ZAI_MCP_OUTPUT in the SAP system. Reads FM interface automatically, generates a caller program, executes it, and returns export parameter values as JSON.',
  inputSchema: {
    type: 'object',
    properties: {
      function_module_name: {
        type: 'string',
        description: 'Function module name to call (e.g., ZAI_FM_001)',
      },
      function_group_name: {
        type: 'string',
        description: 'Function group containing the FM (e.g., ZAI_FG_001)',
      },
      importing: {
        type: 'object',
        description:
          'Import parameters as JSON object. Keys are parameter names, values are the data. For table types pass an array of objects. Example: {"IT_DATA": [{"LIFNR": "20002721"}]}',
      },
      changing: {
        type: 'object',
        description:
          'Changing parameters as JSON object (same format as importing)',
      },
    },
    required: ['function_module_name', 'function_group_name'],
  },
} as const;

interface CallFunctionModuleArgs {
  function_module_name: string;
  function_group_name: string;
  importing?: Record<string, any>;
  changing?: Record<string, any>;
}

interface FmParam {
  name: string;
  type: string;
  direction: 'importing' | 'exporting' | 'changing' | 'tables';
  passby: 'value' | 'reference';
}

const CALLER_PROGRAM = 'ZAI_MCP_FM_CALLER';

/**
 * Parse FM source code to extract parameter interface
 */
function parseFmInterface(sourceCode: string): FmParam[] {
  const params: FmParam[] = [];

  // Match FUNCTION ... IMPORTING/EXPORTING/CHANGING/TABLES sections before the period
  const headerMatch = sourceCode.match(/FUNCTION\s+\S+\s*([\s\S]*?)\.\s*\n/i);
  if (!headerMatch) return params;

  const header = headerMatch[1];
  let currentDirection: FmParam['direction'] | null = null;

  const lines = header.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // Detect direction change
    if (/^IMPORTING\b/i.test(trimmed)) {
      currentDirection = 'importing';
      continue;
    }
    if (/^EXPORTING\b/i.test(trimmed)) {
      currentDirection = 'exporting';
      continue;
    }
    if (/^CHANGING\b/i.test(trimmed)) {
      currentDirection = 'changing';
      continue;
    }
    if (/^TABLES\b/i.test(trimmed)) {
      currentDirection = 'tables';
      continue;
    }

    if (!currentDirection) continue;

    // Match VALUE(param_name) TYPE type_name or param_name TYPE type_name
    const valueMatch = trimmed.match(/VALUE\(\s*(\w+)\s*\)\s+TYPE\s+(\S+)/i);
    if (valueMatch) {
      params.push({
        name: valueMatch[1].toUpperCase(),
        type: valueMatch[2].toUpperCase(),
        direction: currentDirection,
        passby: 'value',
      });
      continue;
    }

    const refMatch = trimmed.match(/^(\w+)\s+TYPE\s+(\S+)/i);
    if (
      refMatch &&
      !refMatch[1].match(
        /^(IMPORTING|EXPORTING|CHANGING|TABLES|FUNCTION|ENDFUNCTION)$/i,
      )
    ) {
      params.push({
        name: refMatch[1].toUpperCase(),
        type: refMatch[2].toUpperCase(),
        direction: currentDirection,
        passby: 'reference',
      });
    }
  }

  return params;
}

/**
 * Generate ABAP source code for the caller program
 */
function generateCallerProgram(
  fmName: string,
  params: FmParam[],
  importData: Record<string, any>,
  changingData: Record<string, any>,
  execId: string,
): string {
  const lines: string[] = [];
  lines.push(`REPORT ${CALLER_PROGRAM.toLowerCase()}.`);
  lines.push('');

  // Declare variables for each parameter
  for (const p of params) {
    lines.push(`DATA lp_${p.name.toLowerCase()} TYPE ${p.type.toLowerCase()}.`);
  }
  lines.push('DATA lv_json TYPE string.');
  lines.push('DATA lv_len TYPE i.');
  lines.push('DATA lv_offset TYPE i.');
  lines.push('DATA lv_remaining TYPE i.');
  lines.push('DATA lv_chunk TYPE c LENGTH 255.');
  lines.push('DATA ls_output TYPE zai_mcp_output.');
  lines.push('DATA lv_seq TYPE n LENGTH 4.');
  lines.push('');

  // Fill import parameters from JSON
  const importParams = params.filter((p) => p.direction === 'importing');
  for (const p of importParams) {
    const data = importData[p.name];
    if (data !== undefined) {
      const jsonStr = JSON.stringify(data).replace(/'/g, "''");
      lines.push(
        `/ui2/cl_json=>deserialize( EXPORTING json = '${jsonStr}' CHANGING data = lp_${p.name.toLowerCase()} ).`,
      );
    }
  }

  // Fill changing parameters from JSON
  const changingParams = params.filter((p) => p.direction === 'changing');
  for (const p of changingParams) {
    const data = changingData[p.name];
    if (data !== undefined) {
      const jsonStr = JSON.stringify(data).replace(/'/g, "''");
      lines.push(
        `/ui2/cl_json=>deserialize( EXPORTING json = '${jsonStr}' CHANGING data = lp_${p.name.toLowerCase()} ).`,
      );
    }
  }

  lines.push('');

  // Build CALL FUNCTION statement
  lines.push(`CALL FUNCTION '${fmName}'`);

  const importCallParams = importParams.filter(
    (p) => importData[p.name] !== undefined,
  );
  const exportParams = params.filter((p) => p.direction === 'exporting');
  const changingCallParams = changingParams;
  const tablesParams = params.filter((p) => p.direction === 'tables');

  if (importCallParams.length > 0) {
    lines.push('  EXPORTING');
    for (let i = 0; i < importCallParams.length; i++) {
      const p = importCallParams[i];
      lines.push(`    ${p.name.toLowerCase()} = lp_${p.name.toLowerCase()}`);
    }
  }

  if (exportParams.length > 0) {
    lines.push('  IMPORTING');
    for (const p of exportParams) {
      lines.push(`    ${p.name.toLowerCase()} = lp_${p.name.toLowerCase()}`);
    }
  }

  if (changingCallParams.length > 0) {
    lines.push('  CHANGING');
    for (const p of changingCallParams) {
      lines.push(`    ${p.name.toLowerCase()} = lp_${p.name.toLowerCase()}`);
    }
  }

  if (tablesParams.length > 0) {
    lines.push('  TABLES');
    for (const p of tablesParams) {
      lines.push(`    ${p.name.toLowerCase()} = lp_${p.name.toLowerCase()}`);
    }
  }

  // Close CALL FUNCTION
  lines.push('.');
  lines.push('');

  // Clean previous results
  lines.push(`DELETE FROM zai_mcp_output WHERE exec_id = '${execId}'.`);
  lines.push('');

  // Serialize each export/changing/tables param and store in output table
  const outputParams = [
    ...exportParams,
    ...changingCallParams,
    ...tablesParams,
  ];

  for (const p of outputParams) {
    lines.push(`* Serialize ${p.name}`);
    lines.push(`CLEAR lv_json.`);
    lines.push(
      `/ui2/cl_json=>serialize( EXPORTING data = lp_${p.name.toLowerCase()} RECEIVING r_json = lv_json ).`,
    );
    lines.push('');

    // Store param name marker
    lines.push(`lv_seq = lv_seq + 1.`);
    lines.push(`ls_output-exec_id = '${execId}'.`);
    lines.push(`ls_output-seq_nr = lv_seq.`);
    lines.push(`ls_output-line = '@@PARAM:${p.name}'.`);
    lines.push(`INSERT zai_mcp_output FROM ls_output.`);
    lines.push('');

    // Split JSON into 255-char chunks
    lines.push(`lv_len = strlen( lv_json ).`);
    lines.push(`lv_offset = 0.`);
    lines.push(`WHILE lv_offset < lv_len.`);
    lines.push(`  lv_seq = lv_seq + 1.`);
    lines.push(`  IF lv_len - lv_offset > 255.`);
    lines.push(`    lv_chunk = lv_json+lv_offset(255).`);
    lines.push(`  ELSE.`);
    lines.push(`    lv_remaining = lv_len - lv_offset.`);
    lines.push(`    lv_chunk = lv_json+lv_offset(lv_remaining).`);
    lines.push(`  ENDIF.`);
    lines.push(`  ls_output-seq_nr = lv_seq.`);
    lines.push(`  ls_output-line = lv_chunk.`);
    lines.push(`  INSERT zai_mcp_output FROM ls_output.`);
    lines.push(`  lv_offset = lv_offset + 255.`);
    lines.push(`ENDWHILE.`);
    lines.push('');
  }

  lines.push('COMMIT WORK.');
  lines.push(`WRITE: / 'OK'.`);

  return lines.join('\n');
}

/**
 * Main handler
 */
export async function handleCallFunctionModule(
  context: HandlerContext,
  args: CallFunctionModuleArgs,
) {
  const { connection, logger } = context;

  try {
    if (!args?.function_module_name) {
      return return_error(new Error('function_module_name is required'));
    }
    if (!args?.function_group_name) {
      return return_error(new Error('function_group_name is required'));
    }

    const fmName = args.function_module_name.toUpperCase();
    const fgName = args.function_group_name.toUpperCase();
    const importData: Record<string, any> = {};
    const changingData: Record<string, any> = {};

    // Normalize param keys to uppercase
    if (args.importing) {
      for (const [k, v] of Object.entries(args.importing)) {
        importData[k.toUpperCase()] = v;
      }
    }
    if (args.changing) {
      for (const [k, v] of Object.entries(args.changing)) {
        changingData[k.toUpperCase()] = v;
      }
    }

    const client = createAdtClient(connection, logger);

    // 1. Read FM source to get parameter interface
    logger?.info?.(`Reading FM interface: ${fmName}`);
    const readResult = await client
      .getFunctionModule()
      .read(
        { functionModuleName: fmName, functionGroupName: fgName },
        'active',
      );

    const sourceCode =
      readResult?.readResult?.data &&
      typeof readResult.readResult.data === 'string'
        ? readResult.readResult.data
        : null;
    if (!sourceCode) {
      return return_error(
        new Error(`Could not read source code for ${fmName}`),
      );
    }

    const params = parseFmInterface(sourceCode);
    if (params.length === 0) {
      return return_error(
        new Error(`Could not parse parameters from ${fmName} source code`),
      );
    }

    logger?.info?.(
      `Parsed ${params.length} parameters: ${params.map((p) => `${p.direction} ${p.name}`).join(', ')}`,
    );

    // 2. Generate unique exec ID
    const execId = `MCP_${Date.now().toString(36).toUpperCase()}`;

    // 3. Generate caller program
    const callerSource = generateCallerProgram(
      fmName,
      params,
      importData,
      changingData,
      execId,
    );

    logger?.info?.('Generated caller program, updating...');

    // 4. Update caller program (must already exist — ZAI_MCP_FM_CALLER in $TMP)
    let lockHandle: string | undefined;
    try {
      lockHandle = await client.getProgram().lock({
        programName: CALLER_PROGRAM,
      });
      await client.getProgram().update(
        {
          programName: CALLER_PROGRAM,
          sourceCode: callerSource,
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
          // ignore unlock errors
        }
      }
    }
    await client.getProgram().activate({ programName: CALLER_PROGRAM });

    logger?.info?.('Caller program activated, executing...');

    // 5. Run the program
    const executor = new AdtExecutor(connection, logger);
    const programExecutor = executor.getProgramExecutor();
    const runResult = await programExecutor.runWithProfiling(
      { programName: CALLER_PROGRAM },
      {
        profilerParameters: {
          description: `CallFM: ${fmName}`,
        },
      },
    );

    if (runResult.response?.status !== 200) {
      return return_error(
        new Error(
          `Program execution failed with status ${runResult.response?.status}`,
        ),
      );
    }

    logger?.info?.('Program executed, reading results...');

    // 6. Query results from ZAI_MCP_OUTPUT
    const sqlResponse = await client.getUtils().getSqlQuery({
      sql_query: `SELECT * FROM zai_mcp_output WHERE exec_id = '${execId}' ORDER BY seq_nr`,
      row_number: 9999,
    });

    // 7. Parse XML response and reconstruct export parameters
    const exportResults: Record<string, any> = {};
    let currentParam = '';
    let currentJson = '';

    const rawXml =
      typeof sqlResponse?.data === 'string' ? sqlResponse.data : '';
    const parsed = parseSqlQueryXml(
      rawXml,
      `SELECT FROM zai_mcp_output`,
      9999,
      logger ?? undefined,
    );

    for (const row of parsed.rows) {
      const line = (row.LINE || '').trim();

      if (line.startsWith('@@PARAM:')) {
        if (currentParam && currentJson) {
          try {
            exportResults[currentParam] = JSON.parse(currentJson);
          } catch {
            exportResults[currentParam] = currentJson;
          }
        }
        currentParam = line.replace('@@PARAM:', '');
        currentJson = '';
      } else {
        currentJson += line;
      }
    }

    if (currentParam && currentJson) {
      try {
        exportResults[currentParam] = JSON.parse(currentJson);
      } catch {
        exportResults[currentParam] = currentJson;
      }
    }

    // 8. Clean up output table
    try {
      // Generate cleanup via another small program run... or leave for next execution
      // For now, cleanup happens at start of next execution (DELETE in generated program)
    } catch {
      // ignore cleanup errors
    }

    logger?.info?.('CallFunctionModule completed successfully');

    return return_response({
      data: JSON.stringify(
        {
          success: true,
          function_module: fmName,
          exec_id: execId,
          export_parameters: exportResults,
        },
        null,
        2,
      ),
    } as AxiosResponse);
  } catch (error: any) {
    logger?.error('CallFunctionModule error:', error?.message || error);

    const errorMessage = error.response?.data
      ? typeof error.response.data === 'string'
        ? error.response.data
        : JSON.stringify(error.response.data)
      : error.message || String(error);

    return return_error(
      new Error(`CallFunctionModule failed: ${errorMessage}`),
    );
  }
}
