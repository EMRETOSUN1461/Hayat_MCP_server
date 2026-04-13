/**
 * ReadAdobeForm Handler
 * Reads an Adobe Form definition — returns form context XML, layout XDP, and metadata.
 * Uses CL_FP_WB_FORM=>LOAD to retrieve form data.
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
  name: 'ReadAdobeForm',
  available_in: ['onprem'] as const,
  description:
    'Read an Adobe Form definition. Returns the form context XML, layout (XDP), interface name, and metadata.',
  inputSchema: {
    type: 'object',
    properties: {
      form_name: {
        type: 'string',
        description: 'Form name (e.g., ZAI_AF_001)',
      },
    },
    required: ['form_name'],
  },
} as const;

interface ReadAdobeFormArgs {
  form_name: string;
}

export async function handleReadAdobeForm(
  context: HandlerContext,
  args: ReadAdobeFormArgs,
) {
  try {
    if (!args?.form_name) {
      return return_error(new Error('form_name is required'));
    }

    const formName = args.form_name.toUpperCase();
    const execId = generateExecId();

    context.logger?.info?.(`Reading Adobe Form: ${formName}`);

    const abapCode = buildReadFormCode(execId, formName);

    const results = await executeAbapAndReadOutput(
      context,
      abapCode,
      execId,
      `Read Adobe Form ${formName}`,
    );

    const status = results['STATUS'] || 'UNKNOWN';
    const message = results['MESSAGE'] || '';

    if (status === 'ERROR') {
      return return_error(
        new Error(`Failed to read form ${formName}: ${message}`),
      );
    }

    return return_response({
      data: JSON.stringify({
        success: true,
        form_name: formName,
        description: results['DESCRIPTION'] || '',
        interface_name: results['INTERFACE_NAME'] || '',
        context_xml: results['CONTEXT_XML'] || '',
        layout_xdp: results['LAYOUT_XDP'] || '',
        message: message || `Form ${formName} read successfully.`,
      }),
    } as AxiosResponse);
  } catch (error: any) {
    return return_error(error);
  }
}

function buildReadFormCode(execId: string, formName: string): string {
  const lines: string[] = [];
  lines.push('REPORT zai_mcp_fm_caller.');
  lines.push('');
  lines.push(abapOutputDeclarations());
  lines.push('DATA lv_ctx_xml TYPE xstring.');
  lines.push('DATA lv_layout TYPE xstring.');
  lines.push('DATA lv_xml_string TYPE string.');
  lines.push('DATA lv_layout_string TYPE string.');
  lines.push('DATA lv_ifname TYPE fpcontext-interface.');
  lines.push('DATA lv_desc TYPE c LENGTH 80.');
  lines.push('');
  lines.push('TRY.');
  lines.push(
    `    SELECT SINGLE context interface FROM fpcontext INTO (lv_ctx_xml, lv_ifname) WHERE name = '${formName}' AND state = 'A'.`,
  );
  lines.push(`    IF sy-subrc <> 0.`);
  lines.push(
    `      SELECT SINGLE context interface FROM fpcontext INTO (lv_ctx_xml, lv_ifname) WHERE name = '${formName}'.`,
  );
  lines.push(`    ENDIF.`);
  lines.push(`    IF sy-subrc <> 0.`);
  lines.push(`      lv_msg = 'Form ${formName} not found.'.`);
  lines.push(abapWriteOutput(execId, 'STATUS', `'ERROR'`));
  lines.push(abapWriteOutput(execId, 'MESSAGE', 'lv_msg'));
  lines.push(`      RETURN.`);
  lines.push(`    ENDIF.`);
  lines.push('');
  lines.push(`    CALL FUNCTION 'ECATT_CONV_XSTRING_TO_STRING'`);
  lines.push(`      EXPORTING`);
  lines.push(`        im_xstring = lv_ctx_xml`);
  lines.push(`      IMPORTING`);
  lines.push(`        ex_string  = lv_xml_string.`);
  lines.push('');
  lines.push(
    `    SELECT SINGLE layout FROM fplayout INTO lv_layout WHERE name = '${formName}' AND state = 'A'.`,
  );
  lines.push(`    IF sy-subrc <> 0.`);
  lines.push(
    `      SELECT SINGLE layout FROM fplayout INTO lv_layout WHERE name = '${formName}'.`,
  );
  lines.push(`    ENDIF.`);
  lines.push(`    IF lv_layout IS NOT INITIAL.`);
  lines.push(`      CALL FUNCTION 'ECATT_CONV_XSTRING_TO_STRING'`);
  lines.push(`        EXPORTING`);
  lines.push(`          im_xstring = lv_layout`);
  lines.push(`        IMPORTING`);
  lines.push(`          ex_string  = lv_layout_string.`);
  lines.push(`    ENDIF.`);
  lines.push('');
  lines.push(
    `    SELECT SINGLE text FROM fpcontextt INTO lv_desc WHERE name = '${formName}' AND language = sy-langu.`,
  );
  lines.push('');
  lines.push(abapWriteOutput(execId, 'STATUS', `'SUCCESS'`));
  lines.push(abapWriteOutput(execId, 'DESCRIPTION', 'lv_desc'));
  lines.push(abapWriteOutput(execId, 'INTERFACE_NAME', 'lv_ifname'));
  lines.push(abapWriteOutput(execId, 'CONTEXT_XML', 'lv_xml_string'));
  lines.push(abapWriteOutput(execId, 'LAYOUT_XDP', 'lv_layout_string'));
  lines.push(`    lv_msg = 'Form ${formName} loaded successfully.'.`);
  lines.push(abapWriteOutput(execId, 'MESSAGE', 'lv_msg'));
  lines.push('');
  lines.push('  CATCH cx_root INTO DATA(lx_err).');
  lines.push('    lv_msg = lx_err->get_text( ).');
  lines.push(abapWriteOutput(execId, 'STATUS', `'ERROR'`));
  lines.push(abapWriteOutput(execId, 'MESSAGE', 'lv_msg'));
  lines.push('ENDTRY.');
  return lines.join('\n');
}
