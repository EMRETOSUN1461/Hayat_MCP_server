/**
 * CreatePackage Handler - Create ABAP Package via ADT API
 *
 * Uses PackageBuilder from @mcp-abap-adt/adt-clients for all operations.
 * Session and lock management handled internally by builder.
 *
 * Workflow: validate -> create -> check -> activate
 */

import type { IPackageConfig } from '@mcp-abap-adt/adt-clients';
import * as z from 'zod';
import { createAdtClient } from '../../../lib/clients';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import {
  type AxiosResponse,
  ErrorCode,
  McpError,
  parseActivationResponse,
  return_error,
  return_response,
} from '../../../lib/utils';

export const TOOL_DEFINITION = {
  name: 'CreatePackage',
  available_in: ['onprem', 'cloud'] as const,
  description:
    'Create a new ABAP package in SAP system. Packages are containers for development objects and are essential for organizing code.',
  inputSchema: {
    package_name: z
      .string()
      .describe(
        'Package name (e.g., ZOK_TEST_0002). Must follow SAP naming conventions (start with Z or Y for customer namespace).',
      ),
    description: z
      .string()
      .optional()
      .describe(
        'Package description. If not provided, package_name will be used.',
      ),
    super_package: z
      .string()
      .describe(
        'Parent package name (e.g., ZOK_PACKAGE). Required for structure packages.',
      ),
    package_type: z
      .enum(['development', 'structure'])
      .default('development')
      .describe("Package type: 'development' (default) or 'structure'"),
    software_component: z
      .string()
      .optional()
      .describe(
        'Software component (e.g., HOME, ZLOCAL). If not provided, SAP will set a default (typically ZLOCAL for local packages).',
      ),
    transport_layer: z
      .string()
      .optional()
      .describe(
        'Transport layer (e.g., ZE19). Required for transportable packages.',
      ),
    transport_request: z
      .string()
      .optional()
      .describe(
        'Transport request number (e.g., E19K905635). Required if package is transportable.',
      ),
    record_changes: z
      .boolean()
      .optional()
      .describe(
        'Enable change recording for the package. Required for transportable packages. Default: false.',
      ),
    application_component: z
      .string()
      .optional()
      .describe('Application component (optional, e.g., BC-ABA)'),
  },
} as const;

interface CreatePackageArgs {
  package_name: string;
  description?: string;
  super_package: string;
  package_type?: string;
  software_component?: string;
  transport_layer?: string;
  transport_request?: string;
  record_changes?: boolean;
  application_component?: string;
}

/**
 * Main handler for CreatePackage MCP tool
 *
 * Uses PackageBuilder from @mcp-abap-adt/adt-clients for all operations
 * Session and lock management handled internally by builder
 */
export async function handleCreatePackage(
  context: HandlerContext,
  args: CreatePackageArgs,
) {
  const { connection, logger } = context;
  try {
    // Validate required parameters
    if (!args?.package_name) {
      throw new McpError(ErrorCode.InvalidParams, 'Package name is required');
    }
    if (!args?.super_package) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Super package (parent package) is required',
      );
    }

    const typedArgs = args;

    // Get connection from session context (set by ProtocolHandler)
    // Connection is managed and cached per session, with proper token refresh via AuthBroker
    const packageName = typedArgs.package_name.toUpperCase();

    logger?.info(`Starting package creation: ${packageName}`);

    const client = createAdtClient(connection, logger);

    try {
      // Validate — tolerate "already exists" (409) so we can recover inactive packages
      try {
        await client.getPackage().validate({
          packageName: packageName,
          superPackage: typedArgs.super_package,
          description: typedArgs.description || packageName,
          softwareComponent: typedArgs.software_component,
          transportLayer: typedArgs.transport_layer,
          transportRequest: typedArgs.transport_request,
          applicationComponent: typedArgs.application_component,
        });
      } catch (validateError: any) {
        // Only treat HTTP 409 as "already exists" — string matching on response bodies is unreliable
        const isAlreadyExists = validateError.response?.status === 409;
        if (!isAlreadyExists) {
          // Log the actual error details for debugging
          logger?.error(
            `Validate failed for ${packageName}: HTTP ${validateError.response?.status || 'N/A'}, message: ${validateError.message}`,
          );
          if (typeof validateError.response?.data === 'string') {
            logger?.error(
              `Validate response body: ${validateError.response.data.slice(0, 500)}`,
            );
          }
          throw validateError;
        }
        logger?.info(
          `Validate reports ${packageName} already exists (409) — attempting activate.`,
        );
        // Try to activate the existing inactive package
        try {
          const activationResponse = await client
            .getUtils()
            .activateObjectsGroup(
              [{ type: 'DEVC/K', name: packageName }],
              true,
            );
          const activationResult = parseActivationResponse(
            activationResponse.data,
          );
          logger?.info(
            `Activation result for ${packageName}: activated=${activationResult.activated}`,
          );
        } catch (actErr: any) {
          logger?.warn(
            `Activate attempt for ${packageName} failed: ${actErr.message}`,
          );
        }
        // Verify if package is now readable
        try {
          const readResult = await client
            .getPackage()
            .read({ packageName }, 'active', {});
          if (readResult?.readResult) {
            logger?.info(
              `✅ Package ${packageName} is now active and readable.`,
            );
            return return_response({
              data: JSON.stringify(
                {
                  success: true,
                  package_name: packageName,
                  description: typedArgs.description || packageName,
                  super_package: typedArgs.super_package,
                  message: `Package ${packageName} already existed and is now active.`,
                },
                null,
                2,
              ),
            } as AxiosResponse);
          }
        } catch (_readErr: any) {
          // Package not readable — fall through to throw
        }
        throw validateError; // re-throw to be handled by outer catch
      }

      // Create - build config object with proper typing
      const createConfig: Partial<IPackageConfig> &
        Pick<
          IPackageConfig,
          'packageName' | 'superPackage' | 'description' | 'softwareComponent'
        > = {
        packageName,
        superPackage: typedArgs.super_package,
        description: typedArgs.description || packageName,
        packageType: typedArgs.package_type,
        softwareComponent: typedArgs.software_component,
      };

      // Only add optional params if explicitly provided
      if (typedArgs.transport_layer) {
        createConfig.transportLayer = typedArgs.transport_layer;
      }
      if (typedArgs.transport_request) {
        createConfig.transportRequest = typedArgs.transport_request;
      }
      if (typedArgs.record_changes !== undefined) {
        createConfig.recordChanges = typedArgs.record_changes;
      }
      if (typedArgs.application_component) {
        createConfig.applicationComponent = typedArgs.application_component;
      }

      // DEBUG: Log softwareComponent at each step
      logger?.debug(
        `[CreatePackage] software_component in args: ${typedArgs.software_component || 'undefined'}`,
      );
      logger?.debug(
        `[CreatePackage] softwareComponent in config: ${createConfig.softwareComponent || 'undefined'}`,
      );

      await client.getPackage().create(createConfig);

      // Check
      await client.getPackage().check({
        packageName: packageName,
        superPackage: typedArgs.super_package,
      });

      // Activate — tolerate activation errors if the package ends up readable
      logger?.info(`Activating package ${packageName}...`);
      try {
        const activationResponse = await client
          .getUtils()
          .activateObjectsGroup([{ type: 'DEVC/K', name: packageName }], true);
        const activationResult = parseActivationResponse(
          activationResponse.data,
        );
        if (!activationResult.activated) {
          logger?.warn(
            `Package ${packageName} created but activation returned warnings: ${JSON.stringify(activationResult.messages)}`,
          );
        }
      } catch (activateErr: any) {
        logger?.warn(
          `Activation threw for ${packageName}: ${activateErr.message}. Verifying package state...`,
        );
        // Activation may fail with parse errors but the package could still be active
        const readResult = await client
          .getPackage()
          .read({ packageName }, 'active', {});
        if (!readResult?.readResult) {
          throw activateErr; // Package genuinely not active — propagate the error
        }
        logger?.info(
          `Package ${packageName} is readable despite activation error — treating as success.`,
        );
      }

      logger?.info(`✅ CreatePackage completed successfully: ${packageName}`);

      return return_response({
        data: JSON.stringify(
          {
            success: true,
            package_name: packageName,
            description: typedArgs.description || packageName,
            super_package: typedArgs.super_package,
            package_type: typedArgs.package_type || 'development',
            software_component: typedArgs.software_component || null,
            transport_layer: typedArgs.transport_layer || null,
            transport_request: typedArgs.transport_request || null,
            uri: `/sap/bc/adt/packages/${packageName.toLowerCase()}`,
            message: `Package ${packageName} created successfully`,
          },
          null,
          2,
        ),
      } as AxiosResponse);
    } catch (error: any) {
      logger?.error(`CreatePackage ${packageName}`, error);
      const responseData =
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data
            ? JSON.stringify(error.response.data)
            : '';
      const responseSnippet = responseData
        ? responseData.slice(0, 1000)
        : undefined;
      if (responseSnippet) {
        logger?.warn(
          `CreatePackage returned HTTP ${error.response?.status} for ${packageName}. Response: ${responseSnippet}`,
        );
      }

      // Check for authentication errors (expired tokens)
      if (
        error.message?.includes('Refresh token has expired') ||
        error.message?.includes('JWT token has expired') ||
        error.message?.includes('Please re-authenticate')
      ) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Authentication failed: ${error.message}. Please re-authenticate using the authentication tool or update your credentials.`,
        );
      }

      // Check if package already exists (HTTP 409 with ExceptionResourceAlreadyExists) — try to recover
      // First, extract the SAP error message from the 409 response for diagnostics
      const sapErrorDetail = responseSnippet
        ? responseSnippet.slice(0, 300)
        : error.message || 'unknown';
      const isAlreadyExistsConflict =
        error.response?.status === 409 &&
        (responseData.includes('ExceptionResourceAlreadyExists') ||
          responseData.includes('already exist'));
      if (error.response?.status === 409 && !isAlreadyExistsConflict) {
        // 409 but NOT "already exists" — e.g. lock conflict, transport mismatch
        throw new McpError(
          ErrorCode.InternalError,
          `SAP returned conflict (409) for ${packageName}: ${sapErrorDetail}`,
        );
      }
      if (isAlreadyExistsConflict) {
        // Strategy 1: try activate — package may be inactive from a prior failed attempt
        try {
          logger?.info(
            `Package ${packageName} already exists (409). Attempting activation...`,
          );
          await client
            .getUtils()
            .activateObjectsGroup(
              [{ type: 'DEVC/K', name: packageName }],
              true,
            );
          // Activation call succeeded (no exception) — verify package is readable
          try {
            const readResult = await client
              .getPackage()
              .read({ packageName }, 'active', {});
            if (readResult?.readResult) {
              logger?.info(
                `✅ Package ${packageName} activated and verified readable.`,
              );
              return return_response({
                data: JSON.stringify(
                  {
                    success: true,
                    package_name: packageName,
                    description: typedArgs.description || packageName,
                    super_package: typedArgs.super_package,
                    message: `Package ${packageName} already existed (inactive) and was activated successfully.`,
                  },
                  null,
                  2,
                ),
              } as AxiosResponse);
            }
          } catch (_readErr: any) {
            // Not readable after activation — continue to delete+recreate
          }
        } catch (activateError: any) {
          logger?.warn(
            `Activation failed for ${packageName}: ${activateError.message}`,
          );
        }

        // Strategy 2: delete broken package, then recreate from scratch
        try {
          logger?.info(
            `Trying delete + recreate for broken package ${packageName}...`,
          );
          await client.getPackage().delete({
            packageName: packageName,
            transportRequest: typedArgs.transport_request,
          });
          logger?.info(`Deleted broken package ${packageName}. Recreating...`);
          await client.getPackage().create({
            packageName,
            superPackage: typedArgs.super_package,
            description: typedArgs.description || packageName,
            softwareComponent: typedArgs.software_component,
            packageType: typedArgs.package_type,
            transportLayer: typedArgs.transport_layer,
            transportRequest: typedArgs.transport_request,
          });
          await client.getPackage().check({
            packageName: packageName,
            superPackage: typedArgs.super_package,
          });
          await client
            .getUtils()
            .activateObjectsGroup(
              [{ type: 'DEVC/K', name: packageName }],
              true,
            );
          logger?.info(
            `✅ Package ${packageName} recreated and activated successfully.`,
          );
          return return_response({
            data: JSON.stringify(
              {
                success: true,
                package_name: packageName,
                description: typedArgs.description || packageName,
                super_package: typedArgs.super_package,
                message: `Package ${packageName} was recreated and activated successfully (recovered from broken state).`,
              },
              null,
              2,
            ),
          } as AxiosResponse);
        } catch (recreateError: any) {
          logger?.error(
            `Failed to recreate package ${packageName}: ${recreateError.message}`,
          );
          throw new McpError(
            ErrorCode.InternalError,
            `Package ${packageName} got 409 from SAP. SAP response: ${sapErrorDetail}. Recovery failed (activate then delete+recreate): ${recreateError.message}`,
          );
        }
      }

      // Check for 401/403 authentication errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        const authError =
          error.response?.status === 401
            ? 'Unauthorized: Authentication failed. Please check your credentials and re-authenticate.'
            : 'Forbidden: Access denied. Please check your permissions.';
        throw new McpError(ErrorCode.InvalidRequest, authError);
      }

      const errorMessage = error.response?.data
        ? typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data)
        : error.message || String(error);

      if (
        error.response?.status === 404 &&
        typeof errorMessage === 'string' &&
        errorMessage.includes('Error while importing object')
      ) {
        try {
          const readState = await client
            .getPackage()
            .read({ packageName: packageName }, 'active', {
              withLongPolling: true,
            });
          if (readState?.readResult) {
            logger?.warn(
              `CreatePackage returned import error, but ${packageName} is readable; continuing as success`,
            );
            return return_response({
              data: JSON.stringify(
                {
                  success: true,
                  package_name: packageName,
                  description: typedArgs.description || packageName,
                  super_package: typedArgs.super_package,
                  package_type: typedArgs.package_type || 'development',
                  software_component: typedArgs.software_component || null,
                  transport_layer: typedArgs.transport_layer || null,
                  transport_request: typedArgs.transport_request || null,
                  uri: `/sap/bc/adt/packages/${packageName.toLowerCase()}`,
                  warning:
                    'Import warning during create (404). Object verified by read.',
                  message: `Package ${packageName} created successfully (import warning ignored).`,
                },
                null,
                2,
              ),
            } as AxiosResponse);
          }
        } catch (_readError) {
          // Fall through to standard error handling below.
        }
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create package ${packageName}: ${errorMessage}`,
      );
    }
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    return return_error(error);
  }
}
