/**
 * DeleteAdobeFormInterface Handler
 * Deletes an Adobe Form Interface from the SAP system.
 * Uses CL_FP_WB_INTERFACE=>DELETE via dynamic program execution.
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
  name: 'DeleteAdobeFormInterface',
  available_in: ['onprem'] as const,
  description:
    'Delete an Adobe Form Interface. Ensure no forms reference this interface before deleting.',
  inputSchema: {
    type: 'object',
    properties: {
      interface_name: {
        type: 'string',
        description: 'Interface name to delete (e.g., ZAI_IF_001)',
      },
      transport_request: {
        type: 'string',
        description:
          'Transport request number. Required for transportable packages.',
      },
    },
    required: ['interface_name'],
  },
} as const;

interface DeleteAdobeFormInterfaceArgs {
  interface_name: string;
  transport_request?: string;
}

export async function handleDeleteAdobeFormInterface(
  context: HandlerContext,
  args: DeleteAdobeFormInterfaceArgs,
) {
  try {
    if (!args?.interface_name) {
      return return_error(new Error('interface_name is required'));
    }

    const ifName = args.interface_name.toUpperCase();
    const transport = args.transport_request || '';
    const execId = generateExecId();

    context.logger?.info?.(`Deleting Adobe Form Interface: ${ifName}`);

    const abapCode = buildDeleteInterfaceCode(execId, ifName, transport);

    const results = await executeAbapAndReadOutput(
      context,
      abapCode,
      execId,
      `Delete Adobe Form Interface ${ifName}`,
    );

    const status = results['STATUS'] || 'UNKNOWN';
    const message = results['MESSAGE'] || '';

    if (status === 'ERROR') {
      return return_error(
        new Error(`Failed to delete interface ${ifName}: ${message}`),
      );
    }

    return return_response({
      data: JSON.stringify({
        success: true,
        interface_name: ifName,
        message: message || `Interface ${ifName} deleted successfully.`,
      }),
    } as AxiosResponse);
  } catch (error: any) {
    return return_error(error);
  }
}

function buildDeleteInterfaceCode(
  execId: string,
  ifName: string,
  transport: string,
): string {
  const lines: string[] = [];
  lines.push('REPORT zai_mcp_fm_caller.');
  lines.push('');
  lines.push(abapOutputDeclarations());
  lines.push('');
  lines.push('TRY.');
  lines.push(`    CALL METHOD cl_fp_wb_interface=>delete`);
  lines.push(`      EXPORTING`);
  lines.push(`        i_name     = '${ifName}'`);
  if (transport) {
    lines.push(`        i_ordernum = '${transport}'.`);
  } else {
    lines.push(`        i_ordernum = ''.`);
  }
  lines.push('');
  lines.push(`    lv_msg = 'Interface ${ifName} deleted successfully.'.`);
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
