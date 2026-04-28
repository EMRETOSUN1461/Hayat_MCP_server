/**
 * CreateTableType Handler — ABAP Table Type creation.
 *
 * Currently only available on legacy/HR systems via the
 * Z_HAYAT_DDIC_CREATE dispatcher FM. ADT REST endpoint for creating a table
 * type is not exposed by the standard ADT API surface, so the onprem/cloud
 * paths are intentionally not implemented here.
 */

import type { HandlerContext } from '../../../lib/handlers/interfaces';
import { HrDdicDispatcherClient } from '../../../lib/hrDdic/HrDdicDispatcherClient';
import { shouldUseHrDdicDispatcher } from '../../../lib/hrDdic/routing';
import type { HrDdicTtypSpec } from '../../../lib/hrDdic/types';
import {
  type AxiosResponse,
  ErrorCode,
  McpError,
  return_error,
  return_response,
} from '../../../lib/utils';
import { validateTransportRequest } from '../../../utils/transportValidation.js';

export const TOOL_DEFINITION = {
  name: 'CreateTableType',
  available_in: ['onprem', 'legacy'] as const,
  description:
    'Create an ABAP table type on a legacy/HR system via the Z_HAYAT_DDIC_CREATE dispatcher FM.',
  inputSchema: {
    type: 'object',
    properties: {
      table_type_name: {
        type: 'string',
        description:
          'Table type name (e.g., ZSD_001_TT01). Must follow SAP naming conventions.',
      },
      description: {
        type: 'string',
        description: 'Table type description',
      },
      package_name: {
        type: 'string',
        description: 'Package name (e.g., ZSD_001, $TMP for local objects)',
      },
      transport_request: {
        type: 'string',
        description:
          'Transport request number. Required for transportable packages.',
      },
      row_type: {
        type: 'string',
        description:
          'Row type — usually a structure name (e.g., ZSD_001_S01). Required.',
      },
      row_kind: {
        type: 'string',
        description:
          "Row kind: 'S' (structure, default), 'E' (elementary), 'L' (line type)",
        enum: ['S', 'E', 'L'],
        default: 'S',
      },
      access_mode: {
        type: 'string',
        description:
          "Access mode: 'T' (standard table, default), 'S' (sorted), 'H' (hashed)",
        enum: ['T', 'S', 'H'],
        default: 'T',
      },
      key_kind: {
        type: 'string',
        description:
          "Key kind: 'N' (non-unique, default), 'U' (unique), 'E' (empty)",
        enum: ['N', 'U', 'E'],
        default: 'N',
      },
      activate: {
        type: 'boolean',
        description: 'Activate after creation (default: true)',
        default: true,
      },
    },
    required: ['table_type_name', 'package_name', 'row_type'],
  },
} as const;

interface CreateTableTypeArgs {
  table_type_name: string;
  description?: string;
  package_name: string;
  transport_request?: string;
  row_type: string;
  row_kind?: 'S' | 'E' | 'L';
  access_mode?: 'T' | 'S' | 'H';
  key_kind?: 'N' | 'U' | 'E';
  activate?: boolean;
}

export async function handleCreateTableType(
  context: HandlerContext,
  args: CreateTableTypeArgs,
) {
  try {
    if (!args?.table_type_name) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'table_type_name is required',
      );
    }
    if (!args?.package_name) {
      throw new McpError(ErrorCode.InvalidParams, 'package_name is required');
    }
    if (!args?.row_type) {
      throw new McpError(ErrorCode.InvalidParams, 'row_type is required');
    }

    validateTransportRequest(args.package_name, args.transport_request);

    if (!shouldUseHrDdicDispatcher()) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'CreateTableType is only available on legacy/HR systems via the RFC dispatcher.',
      );
    }

    const tableTypeName = args.table_type_name.toUpperCase();
    const shouldActivate = args.activate !== false;

    const spec: HrDdicTtypSpec = {
      description: args.description || tableTypeName,
      rowtype: args.row_type.toUpperCase(),
      rowkind: args.row_kind || 'S',
      accessmode: args.access_mode || 'T',
      keykind: args.key_kind || 'N',
    };

    const dispatcher = new HrDdicDispatcherClient(context);
    const result = await dispatcher.invoke({
      objectType: 'TTYP',
      objectName: tableTypeName,
      packageName: args.package_name,
      transportRequest: args.transport_request,
      spec,
      activate: shouldActivate,
    });

    if (!result.success) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create table type ${tableTypeName} via HR dispatcher: ${result.message}`,
      );
    }

    return return_response({
      data: JSON.stringify({
        success: true,
        table_type_name: tableTypeName,
        package: args.package_name,
        transport_request: args.transport_request,
        row_type: args.row_type.toUpperCase(),
        status: shouldActivate ? 'active' : 'inactive',
        message: result.message,
        log: result.log,
        via: 'hr-ddic-dispatcher',
      }),
    } as AxiosResponse);
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    return return_error(error);
  }
}
