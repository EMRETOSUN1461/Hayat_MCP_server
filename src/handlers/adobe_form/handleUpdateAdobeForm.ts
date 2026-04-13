/**
 * UpdateAdobeForm Handler
 * Updates an existing Adobe Form definition (context XML and/or layout XDP).
 * Uses direct DB update + activation via dynamic ABAP execution.
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
  name: 'UpdateAdobeForm',
  available_in: ['onprem'] as const,
  description:
    'Update an existing Adobe Form. Provide context_xml and/or layout_xdp to replace current definitions. Use ReadAdobeForm first to get current values, modify them, and pass back.',
  inputSchema: {
    type: 'object',
    properties: {
      form_name: {
        type: 'string',
        description: 'Form name to update (e.g., ZAI_AF_001)',
      },
      context_xml: {
        type: 'string',
        description:
          'Full form context XML. If omitted, context is not changed.',
      },
      layout_xdp: {
        type: 'string',
        description:
          'Full form layout XDP XML. If omitted, layout is not changed.',
      },
    },
    required: ['form_name'],
  },
} as const;

interface UpdateAdobeFormArgs {
  form_name: string;
  context_xml?: string;
  layout_xdp?: string;
}

export async function handleUpdateAdobeForm(
  context: HandlerContext,
  args: UpdateAdobeFormArgs,
) {
  try {
    if (!args?.form_name) {
      return return_error(new Error('form_name is required'));
    }
    if (!args.context_xml && !args.layout_xdp) {
      return return_error(
        new Error('At least one of context_xml or layout_xdp is required.'),
      );
    }

    const formName = args.form_name.toUpperCase();
    const execId = generateExecId();

    context.logger?.info?.(`Updating Adobe Form: ${formName}`);

    const abapCode = buildUpdateFormCode(
      execId,
      formName,
      args.context_xml,
      args.layout_xdp,
    );

    const results = await executeAbapAndReadOutput(
      context,
      abapCode,
      execId,
      `Update Adobe Form ${formName}`,
    );

    const status = results['STATUS'] || 'UNKNOWN';
    const message = results['MESSAGE'] || '';

    if (status === 'ERROR') {
      return return_error(
        new Error(`Failed to update form ${formName}: ${message}`),
      );
    }

    return return_response({
      data: JSON.stringify({
        success: true,
        form_name: formName,
        context_updated: !!args.context_xml,
        layout_updated: !!args.layout_xdp,
        message: message || `Form ${formName} updated successfully.`,
      }),
    } as AxiosResponse);
  } catch (error: any) {
    return return_error(error);
  }
}

function buildUpdateFormCode(
  execId: string,
  formName: string,
  contextXml?: string,
  layoutXdp?: string,
): string {
  const lines: string[] = [];
  lines.push('REPORT zai_mcp_fm_caller.');
  lines.push('');
  lines.push(abapOutputDeclarations());
  lines.push('DATA lv_xml_string TYPE string.');
  lines.push('DATA lv_xstring TYPE xstring.');
  lines.push('DATA lv_updated TYPE string.');
  lines.push('');
  lines.push('TRY.');
  lines.push(`    lv_updated = ''.`);

  if (contextXml) {
    lines.push('');
    lines.push(abapAssignLongString('lv_xml_string', contextXml));
    lines.push(`    CALL FUNCTION 'ECATT_CONV_STRING_TO_XSTRING'`);
    lines.push(`      EXPORTING`);
    lines.push(`        im_string  = lv_xml_string`);
    lines.push(`      IMPORTING`);
    lines.push(`        ex_xstring = lv_xstring.`);
    lines.push(
      `    UPDATE fpcontext SET context = lv_xstring WHERE name = '${formName}' AND state = 'A'.`,
    );
    lines.push(`    IF sy-subrc <> 0.`);
    lines.push(
      `      UPDATE fpcontext SET context = lv_xstring WHERE name = '${formName}'.`,
    );
    lines.push(`    ENDIF.`);
    lines.push(
      `    CONCATENATE lv_updated 'context' INTO lv_updated SEPARATED BY ' '.`,
    );
  }

  if (layoutXdp) {
    lines.push('');
    lines.push(abapAssignLongString('lv_xml_string', layoutXdp));
    lines.push(`    CALL FUNCTION 'ECATT_CONV_STRING_TO_XSTRING'`);
    lines.push(`      EXPORTING`);
    lines.push(`        im_string  = lv_xml_string`);
    lines.push(`      IMPORTING`);
    lines.push(`        ex_xstring = lv_xstring.`);
    lines.push(
      `    UPDATE fplayout SET layout = lv_xstring WHERE name = '${formName}' AND state = 'A'.`,
    );
    lines.push(`    IF sy-subrc <> 0.`);
    lines.push(
      `      UPDATE fplayout SET layout = lv_xstring WHERE name = '${formName}'.`,
    );
    lines.push(`    ENDIF.`);
    lines.push(
      `    CONCATENATE lv_updated 'layout' INTO lv_updated SEPARATED BY ' '.`,
    );
  }

  lines.push('');
  lines.push(`    COMMIT WORK.`);
  lines.push('');
  lines.push(
    `    CONCATENATE 'Form ${formName} updated (' lv_updated ').' INTO lv_msg.`,
  );
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
