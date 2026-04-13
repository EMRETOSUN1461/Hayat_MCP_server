/**
 * Handler to update function module metadata (e.g., processingType)
 * Uses ADT REST API metadata PUT to change FM attributes like processing type.
 * Valid processingType values: "normal", "rfc" (Remote-Enabled Module)
 */
import { createAdtClient } from '../../../lib/clients';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import {
  type AxiosResponse,
  return_error,
  return_response,
} from '../../../lib/utils';

export const TOOL_DEFINITION = {
  name: 'UpdateFunctionModuleMetadata',
  available_in: ['onprem'] as const,
  description:
    'Update function module metadata attributes such as processing type. Use processing_type "rfc" for Remote-Enabled Module.',
  inputSchema: {
    type: 'object',
    properties: {
      function_module_name: {
        type: 'string',
        description: 'Function module name (e.g., ZAI_FM_001)',
      },
      function_group_name: {
        type: 'string',
        description: 'Function group name (e.g., ZAI_FG_001)',
      },
      processing_type: {
        type: 'string',
        enum: ['normal', 'rfc'],
        description:
          'Processing type: "normal" (Normal Function Module), "rfc" (Remote-Enabled Module)',
      },
    },
    required: [
      'function_module_name',
      'function_group_name',
      'processing_type',
    ],
  },
} as const;

interface UpdateFMMetadataArgs {
  function_module_name: string;
  function_group_name: string;
  processing_type: string;
}

export async function handleUpdateFunctionModuleMetadata(
  context: HandlerContext,
  args: UpdateFMMetadataArgs,
) {
  const { connection, logger } = context;

  try {
    if (!args?.function_module_name || !args?.function_group_name) {
      return return_error(
        new Error('function_module_name and function_group_name are required'),
      );
    }

    const fmName = args.function_module_name.toUpperCase();
    const fgName = args.function_group_name.toUpperCase();
    const processingType = args.processing_type;

    const client = createAdtClient(connection, logger);
    const fmObj = client.getFunctionModule() as any;

    logger?.info?.(
      `Updating metadata for ${fmName}: processingType=${processingType}`,
    );

    const result = await fmObj.updateMetadata(
      { functionModuleName: fmName, functionGroupName: fgName },
      { processingType },
    );

    return return_response({
      data: JSON.stringify(
        {
          success: true,
          function_module: fmName,
          processing_type: processingType,
          status: result?.updateResult?.status,
        },
        null,
        2,
      ),
    } as AxiosResponse);
  } catch (error: any) {
    logger?.error('UpdateFunctionModuleMetadata error:', error?.message);
    const errorMessage = error.response?.data
      ? typeof error.response.data === 'string'
        ? error.response.data
        : JSON.stringify(error.response.data)
      : error.message || String(error);
    return return_error(
      new Error(`UpdateFunctionModuleMetadata failed: ${errorMessage}`),
    );
  }
}
