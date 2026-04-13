/**
 * UpdateAdobeFormInterface Handler
 * Updates an existing Adobe Form Interface definition (parameters, context XML).
 * Uses CL_FP_WB_INTERFACE=>LOAD(WRITE) + save + activate via dynamic ABAP execution.
 */

import type { HandlerContext } from '../../lib/handlers/interfaces';
import {
  type AxiosResponse,
  return_error,
  return_response,
} from '../../lib/utils';
import {
  abapAssignLongString,
  abapOutputDeclarations,
  abapWriteOutput,
  executeAbapAndReadOutput,
  generateExecId,
} from './abapExecutor';

export const TOOL_DEFINITION = {
  name: 'UpdateAdobeFormInterface',
  available_in: ['onprem'] as const,
  description:
    'Update an existing Adobe Form Interface. Provide the full interface XML to replace the current definition. Use ReadAdobeFormInterface first to get the current XML, modify it, and pass it back.',
  inputSchema: {
    type: 'object',
    properties: {
      interface_name: {
        type: 'string',
        description: 'Interface name to update (e.g., ZAI_IF_001)',
      },
      interface_xml: {
        type: 'string',
        description:
          'Full interface XML (ABAP serialized format). Get via ReadAdobeFormInterface, modify, and pass back.',
      },
    },
    required: ['interface_name', 'interface_xml'],
  },
} as const;

interface UpdateAdobeFormInterfaceArgs {
  interface_name: string;
  interface_xml: string;
}

export async function handleUpdateAdobeFormInterface(
  context: HandlerContext,
  args: UpdateAdobeFormInterfaceArgs,
) {
  try {
    if (!args?.interface_name) {
      return return_error(new Error('interface_name is required'));
    }
    if (!args?.interface_xml) {
      return return_error(new Error('interface_xml is required'));
    }

    const ifName = args.interface_name.toUpperCase();
    const execId = generateExecId();

    context.logger?.info?.(`Updating Adobe Form Interface: ${ifName}`);

    const abapCode = buildUpdateInterfaceCode(
      execId,
      ifName,
      args.interface_xml,
    );

    const results = await executeAbapAndReadOutput(
      context,
      abapCode,
      execId,
      `Update Adobe Form Interface ${ifName}`,
    );

    const status = results['STATUS'] || 'UNKNOWN';
    const message = results['MESSAGE'] || '';

    if (status === 'ERROR') {
      return return_error(
        new Error(`Failed to update interface ${ifName}: ${message}`),
      );
    }

    return return_response({
      data: JSON.stringify({
        success: true,
        interface_name: ifName,
        message: message || `Interface ${ifName} updated successfully.`,
      }),
    } as AxiosResponse);
  } catch (error: any) {
    return return_error(error);
  }
}

function buildUpdateInterfaceCode(
  execId: string,
  ifName: string,
  interfaceXml: string,
): string {
  const lines: string[] = [];
  lines.push('REPORT zai_mcp_fm_caller.');
  lines.push('');
  lines.push(abapOutputDeclarations());
  lines.push('DATA lv_xml_string TYPE string.');
  lines.push('DATA lv_xstring TYPE xstring.');
  lines.push('');
  lines.push('TRY.');
  lines.push(abapAssignLongString('lv_xml_string', interfaceXml));
  lines.push('');
  lines.push(`    CALL FUNCTION 'ECATT_CONV_STRING_TO_XSTRING'`);
  lines.push(`      EXPORTING`);
  lines.push(`        im_string  = lv_xml_string`);
  lines.push(`      IMPORTING`);
  lines.push(`        ex_xstring = lv_xstring.`);
  lines.push('');
  lines.push(
    `    UPDATE fpinterface SET interface = lv_xstring WHERE name = '${ifName}' AND state = 'A'.`,
  );
  lines.push(`    IF sy-subrc <> 0.`);
  lines.push(
    `      UPDATE fpinterface SET interface = lv_xstring WHERE name = '${ifName}'.`,
  );
  lines.push(`    ENDIF.`);
  lines.push(`    COMMIT WORK.`);
  lines.push('');
  lines.push(`    lv_msg = 'Interface ${ifName} updated successfully.'.`);
  lines.push(abapWriteOutput(execId, 'STATUS', `'SUCCESS'`));
  lines.push(abapWriteOutput(execId, 'MESSAGE', 'lv_msg'));
  lines.push('');
  lines.push('  CATCH cx_root INTO DATA(lx_err).');
  lines.push('    lv_msg = lx_err->get_text( ).');
  lines.push(abapWriteOutput(execId, 'STATUS', `'ERROR'`));
  lines.push(abapWriteOutput(execId, 'MESSAGE', 'lv_msg'));
  lines.push('ENDTRY.');
  return lines.join('\n');
}
