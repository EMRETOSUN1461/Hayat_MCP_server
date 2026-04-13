/**
 * CreateAdobeFormInterface Handler
 * Creates a new Adobe Form Interface — either from scratch or by copying from a reference.
 * Uses CL_FP_WB_INTERFACE ABAP class methods via dynamic program execution.
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
  name: 'CreateAdobeFormInterface',
  available_in: ['onprem'] as const,
  description:
    'Create a new Adobe Form Interface. Can create from scratch (empty) or copy from a reference interface.',
  inputSchema: {
    type: 'object',
    properties: {
      interface_name: {
        type: 'string',
        description: 'New interface name (e.g., ZAI_IF_001)',
      },
      source_interface: {
        type: 'string',
        description:
          'Source interface name to copy from (e.g., SPPF_BOOK). If omitted, creates an empty interface.',
      },
      description: {
        type: 'string',
        description: 'Description for the interface',
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
    required: ['interface_name'],
  },
} as const;

interface CreateAdobeFormInterfaceArgs {
  interface_name: string;
  source_interface?: string;
  description?: string;
  package?: string;
  transport_request?: string;
}

export async function handleCreateAdobeFormInterface(
  context: HandlerContext,
  args: CreateAdobeFormInterfaceArgs,
) {
  try {
    if (!args?.interface_name) {
      return return_error(new Error('interface_name is required'));
    }

    const ifName = args.interface_name.toUpperCase();
    const srcName = args.source_interface?.toUpperCase() || '';
    const devclass = args.package?.toUpperCase() || '$TMP';
    const transport = args.transport_request || '';
    const execId = generateExecId();

    context.logger?.info?.(
      `Creating Adobe Form Interface: ${ifName}${srcName ? ` (copy from ${srcName})` : ' (empty)'}`,
    );

    let abapCode: string;

    if (srcName) {
      // Copy from reference
      abapCode = buildCopyInterfaceCode(
        execId,
        ifName,
        srcName,
        devclass,
        transport,
      );
    } else {
      // Create from scratch
      abapCode = buildCreateInterfaceCode(
        execId,
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
      `Create Adobe Form Interface ${ifName}`,
    );

    const status = results['STATUS'] || 'UNKNOWN';
    const message = results['MESSAGE'] || '';

    if (status === 'ERROR') {
      return return_error(
        new Error(`Failed to create interface ${ifName}: ${message}`),
      );
    }

    return return_response({
      data: JSON.stringify({
        success: true,
        interface_name: ifName,
        source_interface: srcName || null,
        package: devclass,
        transport_request: transport || 'local',
        message: message || `Interface ${ifName} created successfully.`,
      }),
    } as AxiosResponse);
  } catch (error: any) {
    return return_error(error);
  }
}

function buildCopyInterfaceCode(
  execId: string,
  ifName: string,
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
  lines.push(`    CALL METHOD cl_fp_wb_interface=>copy`);
  lines.push(`      EXPORTING`);
  lines.push(`        i_name     = '${ifName}'`);
  lines.push(`        i_source   = '${srcName}'`);
  lines.push(`        i_devclass = '${devclass}'`);
  if (transport) {
    lines.push(`        i_ordernum = '${transport}'.`);
  } else {
    lines.push(`        i_ordernum = ''.`);
  }
  lines.push('');
  lines.push(`    ls_object-object = 'SFPI'.`);
  lines.push(`    ls_object-obj_name = '${ifName}'.`);
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
    `    lv_msg = 'Interface ${ifName} copied from ${srcName} and activated.'.`,
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

function buildCreateInterfaceCode(
  execId: string,
  ifName: string,
  devclass: string,
  transport: string,
  description?: string,
): string {
  const lines: string[] = [];
  lines.push('REPORT zai_mcp_fm_caller.');
  lines.push('');
  lines.push(abapOutputDeclarations());
  lines.push('DATA lo_interface TYPE REF TO if_fp_interface.');
  lines.push('DATA lo_wb_interface TYPE REF TO if_fp_wb_interface.');
  lines.push('');
  lines.push('DATA lt_objects TYPE TABLE OF dwinactiv.');
  lines.push('DATA ls_object TYPE dwinactiv.');
  lines.push('');
  lines.push('TRY.');
  lines.push(`    lo_interface = cl_fp_interface=>create( ).`);
  lines.push('');
  lines.push(`    lo_wb_interface = cl_fp_wb_interface=>create(`);
  lines.push(`      i_name      = '${ifName}'`);
  lines.push(`      i_interface = lo_interface`);
  lines.push(`      i_devclass  = '${devclass}'`);
  if (transport) {
    lines.push(`      i_ordernum  = '${transport}' ).`);
  } else {
    lines.push(`      i_ordernum  = '' ).`);
  }
  lines.push('');
  lines.push(`    lo_wb_interface->save( ).`);
  lines.push(`    lo_wb_interface->free( ).`);
  lines.push('');
  lines.push(`    ls_object-object = 'SFPI'.`);
  lines.push(`    ls_object-obj_name = '${ifName}'.`);
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
  lines.push(`    lv_msg = 'Interface ${ifName} created and activated.'.`);
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
