/**
 * ReadAdobeFormInterface Handler
 * Reads an Adobe Form Interface definition — returns context XML, parameters, and metadata.
 * Uses CL_FP_WB_INTERFACE=>LOAD to retrieve interface data.
 */

import type { HandlerContext } from '../../lib/handlers/interfaces';
import {
  type AxiosResponse,
  return_error,
  return_response,
} from '../../lib/utils';
import {
  abapOutputDeclarations,
  abapWriteOutput,
  executeAbapAndReadOutput,
  generateExecId,
} from './abapExecutor';

export const TOOL_DEFINITION = {
  name: 'ReadAdobeFormInterface',
  available_in: ['onprem'] as const,
  description:
    'Read an Adobe Form Interface definition. Returns the interface parameters, context data, and metadata as XML.',
  inputSchema: {
    type: 'object',
    properties: {
      interface_name: {
        type: 'string',
        description: 'Interface name (e.g., ZAI_IF_001)',
      },
    },
    required: ['interface_name'],
  },
} as const;

interface ReadAdobeFormInterfaceArgs {
  interface_name: string;
}

export async function handleReadAdobeFormInterface(
  context: HandlerContext,
  args: ReadAdobeFormInterfaceArgs,
) {
  try {
    if (!args?.interface_name) {
      return return_error(new Error('interface_name is required'));
    }

    const ifName = args.interface_name.toUpperCase();
    const execId = generateExecId();

    context.logger?.info?.(`Reading Adobe Form Interface: ${ifName}`);

    const abapCode = buildReadInterfaceCode(execId, ifName);

    const results = await executeAbapAndReadOutput(
      context,
      abapCode,
      execId,
      `Read Adobe Form Interface ${ifName}`,
    );

    const status = results['STATUS'] || 'UNKNOWN';
    const message = results['MESSAGE'] || '';

    if (status === 'ERROR') {
      return return_error(
        new Error(`Failed to read interface ${ifName}: ${message}`),
      );
    }

    return return_response({
      data: JSON.stringify({
        success: true,
        interface_name: ifName,
        description: results['DESCRIPTION'] || '',
        interface_xml: results['INTERFACE_XML'] || '',
        message: message || `Interface ${ifName} read successfully.`,
      }),
    } as AxiosResponse);
  } catch (error: any) {
    return return_error(error);
  }
}

function buildReadInterfaceCode(execId: string, ifName: string): string {
  const lines: string[] = [];
  lines.push('REPORT zai_mcp_fm_caller.');
  lines.push('');
  lines.push(abapOutputDeclarations());
  lines.push('DATA lv_xml TYPE xstring.');
  lines.push('DATA lv_xml_string TYPE string.');
  lines.push('DATA lv_desc TYPE c LENGTH 80.');
  lines.push('');
  lines.push('TRY.');
  lines.push(
    `    SELECT SINGLE interface FROM fpinterface INTO lv_xml WHERE name = '${ifName}' AND state = 'A'.`,
  );
  lines.push(`    IF sy-subrc <> 0.`);
  lines.push(
    `      SELECT SINGLE interface FROM fpinterface INTO lv_xml WHERE name = '${ifName}'.`,
  );
  lines.push(`    ENDIF.`);
  lines.push(`    IF sy-subrc <> 0.`);
  lines.push(`      lv_msg = 'Interface ${ifName} not found.'.`);
  lines.push(abapWriteOutput(execId, 'STATUS', `'ERROR'`));
  lines.push(abapWriteOutput(execId, 'MESSAGE', 'lv_msg'));
  lines.push(`      RETURN.`);
  lines.push(`    ENDIF.`);
  lines.push('');
  lines.push(`    CALL FUNCTION 'ECATT_CONV_XSTRING_TO_STRING'`);
  lines.push(`      EXPORTING`);
  lines.push(`        im_xstring = lv_xml`);
  lines.push(`      IMPORTING`);
  lines.push(`        ex_string  = lv_xml_string.`);
  lines.push('');
  lines.push(
    `    SELECT SINGLE text FROM fpinterfacet INTO lv_desc WHERE name = '${ifName}' AND language = sy-langu.`,
  );
  lines.push('');
  lines.push(abapWriteOutput(execId, 'STATUS', `'SUCCESS'`));
  lines.push(abapWriteOutput(execId, 'DESCRIPTION', 'lv_desc'));
  lines.push(abapWriteOutput(execId, 'INTERFACE_XML', 'lv_xml_string'));
  lines.push(`    lv_msg = 'Interface ${ifName} loaded successfully.'.`);
  lines.push(abapWriteOutput(execId, 'MESSAGE', 'lv_msg'));
  lines.push('');
  lines.push('  CATCH cx_root INTO DATA(lx_err).');
  lines.push('    lv_msg = lx_err->get_text( ).');
  lines.push(abapWriteOutput(execId, 'STATUS', `'ERROR'`));
  lines.push(abapWriteOutput(execId, 'MESSAGE', 'lv_msg'));
  lines.push('ENDTRY.');
  return lines.join('\n');
}
