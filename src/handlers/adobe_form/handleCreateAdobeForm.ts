/**
 * CreateAdobeForm Handler
 * Creates a new Adobe Form — either from scratch or by copying from a reference.
 * Uses CL_FP_WB_FORM ABAP class methods via dynamic program execution.
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
  name: 'CreateAdobeForm',
  available_in: ['onprem'] as const,
  description:
    'Create a new Adobe Form. Can create from scratch (empty, requires interface_name) or copy from a reference form.',
  inputSchema: {
    type: 'object',
    properties: {
      form_name: {
        type: 'string',
        description: 'New form name (e.g., ZAI_AF_001)',
      },
      source_form: {
        type: 'string',
        description:
          'Source form name to copy from (e.g., SPPF_BOOK_DEMO). If omitted, creates an empty form.',
      },
      interface_name: {
        type: 'string',
        description:
          'Interface name for the form. Required when creating from scratch. For copy, the source form interface is used.',
      },
      description: {
        type: 'string',
        description: 'Description for the form',
      },
      package: {
        type: 'string',
        description: 'Package name (default: $TMP)',
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

interface CreateAdobeFormArgs {
  form_name: string;
  source_form?: string;
  interface_name?: string;
  description?: string;
  package?: string;
  transport_request?: string;
}

export async function handleCreateAdobeForm(
  context: HandlerContext,
  args: CreateAdobeFormArgs,
) {
  try {
    if (!args?.form_name) {
      return return_error(new Error('form_name is required'));
    }
    if (!args.source_form && !args.interface_name) {
      return return_error(
        new Error(
          'interface_name is required when creating a form from scratch (no source_form).',
        ),
      );
    }

    const formName = args.form_name.toUpperCase();
    const srcName = args.source_form?.toUpperCase() || '';
    const ifName = args.interface_name?.toUpperCase() || '';
    const devclass = args.package?.toUpperCase() || '$TMP';
    const transport = args.transport_request || '';
    const execId = generateExecId();

    context.logger?.info?.(
      `Creating Adobe Form: ${formName}${srcName ? ` (copy from ${srcName})` : ' (empty)'}`,
    );

    let abapCode: string;

    if (srcName) {
      abapCode = buildCopyFormCode(
        execId,
        formName,
        srcName,
        devclass,
        transport,
      );
    } else {
      abapCode = buildCreateFormCode(
        execId,
        formName,
        ifName,
        devclass,
        transport,
        args.description,
      );
    }

    const results = await executeAbapAndReadOutput(
      context,
      abapCode,
      execId,
      `Create Adobe Form ${formName}`,
    );

    const status = results['STATUS'] || 'UNKNOWN';
    const message = results['MESSAGE'] || '';

    if (status === 'ERROR') {
      return return_error(
        new Error(`Failed to create form ${formName}: ${message}`),
      );
    }

    return return_response({
      data: JSON.stringify({
        success: true,
        form_name: formName,
        source_form: srcName || null,
        interface_name: ifName || null,
        package: devclass,
        transport_request: transport || 'local',
        message: message || `Form ${formName} created successfully.`,
      }),
    } as AxiosResponse);
  } catch (error: any) {
    return return_error(error);
  }
}

function buildCopyFormCode(
  execId: string,
  formName: string,
  srcName: string,
  devclass: string,
  transport: string,
): string {
  const lines: string[] = [];
  lines.push('REPORT zai_mcp_fm_caller.');
  lines.push('');
  lines.push(abapOutputDeclarations());
  lines.push('DATA lt_objects TYPE TABLE OF dwinactiv.');
  lines.push('DATA ls_object TYPE dwinactiv.');
  lines.push('');
  lines.push('TRY.');
  lines.push(`    CALL METHOD cl_fp_wb_form=>copy`);
  lines.push(`      EXPORTING`);
  lines.push(`        i_name     = '${formName}'`);
  lines.push(`        i_source   = '${srcName}'`);
  lines.push(`        i_devclass = '${devclass}'`);
  if (transport) {
    lines.push(`        i_ordernum = '${transport}'`);
  } else {
    lines.push(`        i_ordernum = ''`);
  }
  lines.push(`        i_dark     = abap_true.`);
  lines.push('');
  lines.push(`    ls_object-object = 'SFPF'.`);
  lines.push(`    ls_object-obj_name = '${formName}'.`);
  lines.push(`    APPEND ls_object TO lt_objects.`);
  lines.push(`    CALL FUNCTION 'RS_WORKING_OBJECTS_ACTIVATE'`);
  lines.push(`      EXPORTING`);
  lines.push(`        activate_ddic_objects = ' '`);
  lines.push(`        with_popup            = ' '`);
  lines.push(`      TABLES`);
  lines.push(`        objects               = lt_objects`);
  lines.push(`      EXCEPTIONS`);
  lines.push(`        excecution_error      = 1`);
  lines.push(`        cancelled             = 2`);
  lines.push(`        insert_into_corr_error = 3`);
  lines.push(`        OTHERS                = 4.`);
  lines.push(`    IF sy-subrc <> 0.`);
  lines.push(`      lv_msg = |Activation failed with sy-subrc={ sy-subrc }|.`);
  lines.push(abapWriteOutput(execId, 'STATUS', `'ERROR'`));
  lines.push(abapWriteOutput(execId, 'MESSAGE', 'lv_msg'));
  lines.push(`      RETURN.`);
  lines.push(`    ENDIF.`);
  lines.push('');
  lines.push(
    `    lv_msg = 'Form ${formName} copied from ${srcName} and activated.'.`,
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

function buildCreateFormCode(
  execId: string,
  formName: string,
  ifName: string,
  devclass: string,
  transport: string,
  description?: string,
): string {
  const lines: string[] = [];
  lines.push('REPORT zai_mcp_fm_caller.');
  lines.push('');
  lines.push(abapOutputDeclarations());
  lines.push('DATA lo_form TYPE REF TO if_fp_form.');
  lines.push('DATA lo_wb_form TYPE REF TO if_fp_wb_form.');
  lines.push('');
  lines.push('TRY.');
  lines.push(`    lo_form = cl_fp_form=>create( ).`);
  lines.push(`    lo_form->set_interface_name( '${ifName}' ).`);
  lines.push('');
  lines.push(`    lo_wb_form = cl_fp_wb_form=>create(`);
  lines.push(`      i_name     = '${formName}'`);
  lines.push(`      i_form     = lo_form`);
  lines.push(`      i_devclass = '${devclass}'`);
  if (transport) {
    lines.push(`      i_ordernum = '${transport}' ).`);
  } else {
    lines.push(`      i_ordernum = '' ).`);
  }
  lines.push('');
  lines.push(`    lo_wb_form->save( ).`);
  lines.push(`    lo_wb_form->free( ).`);
  lines.push('');
  lines.push(
    `    lv_msg = 'Form ${formName} created with interface ${ifName} (inactive - activate after adding layout).'.`,
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
