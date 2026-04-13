/**
 * DeleteAdobeForm Handler
 * Deletes an Adobe Form from the SAP system.
 * Uses CL_FP_WB_FORM=>DELETE via dynamic program execution.
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
  name: 'DeleteAdobeForm',
  available_in: ['onprem'] as const,
  description: 'Delete an Adobe Form from the SAP system.',
  inputSchema: {
    type: 'object',
    properties: {
      form_name: {
        type: 'string',
        description: 'Form name to delete (e.g., ZAI_AF_001)',
      },
      transport_request: {
        type: 'string',
        description:
          'Transport request number. Required for transportable packages.',
      },
    },
    required: ['form_name'],
  },
} as const;

interface DeleteAdobeFormArgs {
  form_name: string;
  transport_request?: string;
}

export async function handleDeleteAdobeForm(
  context: HandlerContext,
  args: DeleteAdobeFormArgs,
) {
  try {
    if (!args?.form_name) {
      return return_error(new Error('form_name is required'));
    }

    const formName = args.form_name.toUpperCase();
    const transport = args.transport_request || '';
    const execId = generateExecId();

    context.logger?.info?.(`Deleting Adobe Form: ${formName}`);

    const abapCode = buildDeleteFormCode(execId, formName, transport);

    const results = await executeAbapAndReadOutput(
      context,
      abapCode,
      execId,
      `Delete Adobe Form ${formName}`,
    );

    const status = results['STATUS'] || 'UNKNOWN';
    const message = results['MESSAGE'] || '';

    if (status === 'ERROR') {
      return return_error(
        new Error(`Failed to delete form ${formName}: ${message}`),
      );
    }

    return return_response({
      data: JSON.stringify({
        success: true,
        form_name: formName,
        message: message || `Form ${formName} deleted successfully.`,
      }),
    } as AxiosResponse);
  } catch (error: any) {
    return return_error(error);
  }
}

function buildDeleteFormCode(
  execId: string,
  formName: string,
  transport: string,
): string {
  const lines: string[] = [];
  lines.push('REPORT zai_mcp_fm_caller.');
  lines.push('');
  lines.push(abapOutputDeclarations());
  lines.push('');
  lines.push('TRY.');
  lines.push(`    CALL METHOD cl_fp_wb_form=>delete`);
  lines.push(`      EXPORTING`);
  lines.push(`        i_name     = '${formName}'`);
  if (transport) {
    lines.push(`        i_ordernum = '${transport}'.`);
  } else {
    lines.push(`        i_ordernum = ''.`);
  }
  lines.push('');
  lines.push(`    lv_msg = 'Form ${formName} deleted successfully.'.`);
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
