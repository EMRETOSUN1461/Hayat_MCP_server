/**
 * CreateTable Handler - ABAP Table Creation via ADT API
 *
 * Workflow: validate -> create -> lock -> update DDL -> unlock -> activate
 * If fields are provided, generates DDL automatically.
 * If no fields, creates table in initial state (use UpdateTable to set DDL).
 */

import { createAdtClient } from '../../../lib/clients';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import {
  type AxiosResponse,
  ErrorCode,
  McpError,
  return_error,
  return_response,
  safeCheckOperation,
} from '../../../lib/utils';
import { validateTransportRequest } from '../../../utils/transportValidation.js';

export const TOOL_DEFINITION = {
  name: 'CreateTable',
  available_in: ['onprem', 'cloud'] as const,
  description:
    'Create a new ABAP table via the ADT API. Creates the table object in initial state. Use UpdateTable to set DDL code afterwards.',
  inputSchema: {
    type: 'object',
    properties: {
      table_name: {
        type: 'string',
        description:
          'Table name (e.g., ZZ_TEST_TABLE_001). Must follow SAP naming conventions.',
      },
      description: {
        type: 'string',
        description: 'Table description for validation and creation.',
      },
      package_name: {
        type: 'string',
        description: 'Package name (e.g., ZOK_LOCAL, $TMP for local objects)',
      },
      transport_request: {
        type: 'string',
        description:
          'Transport request number (e.g., E19K905635). Required for transportable packages.',
      },
      table_category: {
        type: 'string',
        description:
          'Table category: TRANSPARENT (default), STRUCTURE, GLOBAL_TEMPORARY, etc.',
        default: 'TRANSPARENT',
      },
      delivery_class: {
        type: 'string',
        description:
          'Delivery class: A (Application, default), C (Customizing), L (Temporary), G (Customer), E (Control), S (System), W (System/no import).',
        default: 'A',
      },
      data_maintenance: {
        type: 'string',
        description:
          'Data maintenance: RESTRICTED (default), ALLOWED, NOT_ALLOWED.',
        default: 'RESTRICTED',
      },
      fields: {
        type: 'array',
        description: 'Array of table fields with data element references',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Field name (e.g., MANDT, VBELN)',
            },
            data_element: {
              type: 'string',
              description: 'Data element name (e.g., MANDT, VBELN_VA)',
            },
            key: {
              type: 'boolean',
              description: 'Is this a key field? Default: false',
            },
            not_null: {
              type: 'boolean',
              description:
                'NOT NULL constraint. Default: true for key fields, false for others.',
            },
            curr_quan_ref: {
              type: 'string',
              description:
                'Currency/quantity reference in TABLE-FIELD format (e.g., BKPF-WAERS). Required for CURR/QUAN type fields.',
            },
          },
          required: ['name', 'data_element'],
        },
      },
      activate: {
        type: 'boolean',
        description:
          'Activate table after creation. Default: true. Only applicable when fields are provided.',
      },
    },
    required: ['table_name', 'package_name'],
  },
} as const;

interface TableField {
  name: string;
  data_element: string;
  key?: boolean;
  not_null?: boolean;
  curr_quan_ref?: string;
}

interface CreateTableArgs {
  table_name: string;
  description?: string;
  package_name: string;
  transport_request?: string;
  table_category?: string;
  delivery_class?: string;
  data_maintenance?: string;
  fields?: TableField[];
  activate?: boolean;
}

/**
 * Main handler for CreateTable MCP tool
 */
export async function handleCreateTable(
  context: HandlerContext,
  args: CreateTableArgs,
): Promise<any> {
  const { connection, logger } = context;
  try {
    const createTableArgs = args as CreateTableArgs;

    // Validate required parameters
    if (!createTableArgs?.table_name) {
      throw new McpError(ErrorCode.InvalidParams, 'Table name is required');
    }
    if (!createTableArgs?.package_name) {
      throw new McpError(ErrorCode.InvalidParams, 'Package name is required');
    }

    // Validate transport_request: required for non-$TMP packages
    validateTransportRequest(
      createTableArgs.package_name,
      createTableArgs.transport_request,
    );

    const tableName = createTableArgs.table_name.toUpperCase();
    const hasFields =
      createTableArgs.fields &&
      Array.isArray(createTableArgs.fields) &&
      createTableArgs.fields.length > 0;
    const shouldActivate = hasFields && createTableArgs.activate !== false;

    logger?.info(`Starting table creation: ${tableName}`);

    try {
      // Create client
      const client = createAdtClient(connection, logger);

      // Validate
      await client.getTable().validate({
        tableName,
        packageName: createTableArgs.package_name,
        description: createTableArgs.description || tableName,
      });

      // Create
      await client.getTable().create({
        tableName,
        packageName: createTableArgs.package_name,
        description: createTableArgs.description || tableName,
        ddlCode: '',
        transportRequest: createTableArgs.transport_request,
      });

      logger?.info(`Table created: ${tableName}`);

      // If fields provided, generate DDL and update
      if (hasFields) {
        const description = createTableArgs.description || tableName;
        const deliveryClass = (
          createTableArgs.delivery_class || 'A'
        ).toUpperCase();
        const dataMaintenance = (
          createTableArgs.data_maintenance || 'RESTRICTED'
        ).toUpperCase();

        // Map delivery class to DDL enum
        const deliveryClassMap: Record<string, string> = {
          A: '#A',
          C: '#C',
          L: '#L',
          G: '#G',
          E: '#E',
          S: '#S',
          W: '#W',
        };
        const deliveryClassDdl = deliveryClassMap[deliveryClass] || '#A';

        // Map data maintenance to DDL enum
        const dataMaintenanceMap: Record<string, string> = {
          RESTRICTED: '#RESTRICTED',
          ALLOWED: '#ALLOWED',
          NOT_ALLOWED: '#NOT_ALLOWED',
        };
        const dataMaintenanceDdl =
          dataMaintenanceMap[dataMaintenance] || '#RESTRICTED';

        // Generate field lines
        const fieldLines = createTableArgs.fields!.map((field) => {
          const fieldName = field.name.toLowerCase();
          const dataElement = field.data_element.toLowerCase();
          const isKey = field.key === true;
          const notNull = field.not_null !== undefined ? field.not_null : isKey;

          let annotation = '';
          if (field.curr_quan_ref) {
            // Convert TABLE-FIELD format to table.field for annotation
            const ref = field.curr_quan_ref.replace('-', '.').toLowerCase();
            annotation = `  @Semantics.amount.currencyCode : '${ref}'\n`;
          }

          const keyPrefix = isKey ? 'key ' : '    ';
          const notNullSuffix = notNull ? ' not null' : '';
          return `${annotation}  ${keyPrefix}${fieldName} : ${dataElement}${notNullSuffix};`;
        });

        const ddlCode = [
          `@EndUserText.label : '${description}'`,
          '@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE',
          '@AbapCatalog.tableCategory : #TRANSPARENT',
          `@AbapCatalog.deliveryClass : ${deliveryClassDdl}`,
          `@AbapCatalog.dataMaintenance : ${dataMaintenanceDdl}`,
          `define table ${tableName.toLowerCase()} {`,
          '',
          ...fieldLines,
          '',
          '}',
        ].join('\n');

        logger?.info(`[CreateTable] Generated DDL for ${tableName}`);

        // Lock
        const lockHandle = await client.getTable().lock({ tableName });

        try {
          // Update with generated DDL
          await client.getTable().update(
            {
              tableName,
              ddlCode,
              transportRequest: createTableArgs.transport_request,
            },
            { lockHandle },
          );
          logger?.info(`[CreateTable] Table DDL updated: ${tableName}`);

          // Unlock
          await client.getTable().unlock({ tableName }, lockHandle);
          logger?.info(`[CreateTable] Table unlocked: ${tableName}`);

          // Check inactive version
          try {
            await safeCheckOperation(
              () => client.getTable().check({ tableName }, 'inactive'),
              tableName,
              {
                debug: (message: string) =>
                  logger?.debug(`[CreateTable] ${message}`),
              },
            );
          } catch (checkError: any) {
            if (!(checkError as any).isAlreadyChecked) {
              logger?.warn(
                `[CreateTable] Inactive check had issues: ${tableName}`,
              );
            }
          }

          // Activate
          if (shouldActivate) {
            await client.getTable().activate({ tableName });
            logger?.info(`[CreateTable] Table activated: ${tableName}`);
          }
        } catch (error) {
          // Unlock on error
          try {
            await client.getTable().unlock({ tableName }, lockHandle);
          } catch (unlockError) {
            logger?.error('Failed to unlock table after error:', unlockError);
          }
          throw error;
        }
      }

      logger?.info(`✅ CreateTable completed successfully: ${tableName}`);

      return return_response({
        data: JSON.stringify({
          success: true,
          table_name: tableName,
          package_name: createTableArgs.package_name,
          transport_request: createTableArgs.transport_request || 'local',
          activated: shouldActivate,
          message: hasFields
            ? `Table ${tableName} created successfully${shouldActivate ? ' and activated' : ''}`
            : `Table ${tableName} created successfully. Use UpdateTable to set DDL code.`,
        }),
      } as AxiosResponse);
    } catch (error: any) {
      logger?.error(
        `Error creating table ${tableName}: ${error?.message || error}`,
      );

      // Check if table already exists
      if (
        error.message?.includes('already exists') ||
        error.response?.status === 409
      ) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Table ${tableName} already exists. Please delete it first or use a different name.`,
        );
      }

      const errorMessage = error.response?.data
        ? typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data)
        : error.message || String(error);

      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create table ${tableName}: ${errorMessage}`,
      );
    }
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    return return_error(error);
  }
}
