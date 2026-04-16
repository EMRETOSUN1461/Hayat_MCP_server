/**
 * DeletePackage Handler - Delete ABAP Package via ADT API
 *
 * Uses AdtClient.getPackage().delete() for high-level delete operation.
 * Session and lock management handled internally by client.
 */

import { createAdtClient } from '../../../lib/clients';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import {
  type AxiosResponse,
  return_error,
  return_response,
} from '../../../lib/utils';

export const TOOL_DEFINITION = {
  name: 'DeletePackage',
  available_in: ['onprem', 'cloud', 'legacy'] as const,
  description:
    'Delete an ABAP package from the SAP system. Transport request optional for $TMP objects.',
  inputSchema: {
    type: 'object',
    properties: {
      package_name: {
        type: 'string',
        description:
          'Package name (e.g., ZOK_TEST_0002). Must follow SAP naming conventions.',
      },
      transport_request: {
        type: 'string',
        description:
          'Transport request number (e.g., E19K905635). Required for transportable objects. Optional for local objects ($TMP).',
      },
    },
    required: ['package_name'],
  },
} as const;

interface DeletePackageArgs {
  package_name: string;
  transport_request?: string;
}

/**
 * Main handler for DeletePackage MCP tool
 *
 * Uses AdtClient.getPackage().delete() - high-level delete operation
 */
export async function handleDeletePackage(
  context: HandlerContext,
  args: DeletePackageArgs,
) {
  const { connection, logger } = context;
  try {
    const { package_name, transport_request } = args as DeletePackageArgs;

    // Validation
    if (!package_name) {
      return return_error(new Error('package_name is required'));
    }

    const client = createAdtClient(connection, logger);
    const packageName = package_name.toUpperCase();

    logger?.info(`Starting package deletion: ${packageName}`);

    try {
      // Delete package using AdtClient
      const packageObject = client.getPackage();
      const deleteState = await packageObject.delete({
        packageName,
        transportRequest: transport_request,
      });

      if (!deleteState || !deleteState.deleteResult) {
        throw new Error(
          `Delete did not return a response for package ${packageName}`,
        );
      }

      // Verify deletion — read returns undefined when object doesn't exist (404)
      const verifyResult = await packageObject.read({ packageName });
      if (verifyResult !== undefined) {
        throw new Error(
          `Package ${packageName} deletion reported success but the object still exists. Check transport locks and permissions.`,
        );
      }

      logger?.info(`✅ DeletePackage completed successfully: ${packageName}`);

      return return_response({
        data: JSON.stringify(
          {
            success: true,
            package_name: packageName,
            transport_request: transport_request || null,
            message: `Package ${packageName} deleted successfully.`,
          },
          null,
          2,
        ),
      } as AxiosResponse);
    } catch (error: any) {
      logger?.error(
        `Error deleting package ${packageName}: ${error?.message || error}`,
      );

      // Parse error message
      let errorMessage = `Failed to delete package: ${error.message || String(error)}`;

      if (error.response?.status === 404) {
        errorMessage = `Package ${packageName} not found. It may already be deleted.`;
      } else if (error.response?.status === 423) {
        errorMessage = `Package ${packageName} is locked by another user. Cannot delete.`;
      } else if (error.response?.status === 400) {
        errorMessage = `Bad request. Check if transport request is required and valid.`;
      } else if (
        error.response?.data &&
        typeof error.response.data === 'string'
      ) {
        try {
          const { XMLParser } = require('fast-xml-parser');
          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
          });
          const errorData = parser.parse(error.response.data);
          const errorMsg =
            errorData['exc:exception']?.message?.['#text'] ||
            errorData['exc:exception']?.message;
          if (errorMsg) {
            errorMessage = `SAP Error: ${errorMsg}`;
          }
        } catch (_parseError) {
          // Ignore parse errors
        }
      }

      return return_error(new Error(errorMessage));
    }
  } catch (error: any) {
    return return_error(error);
  }
}
