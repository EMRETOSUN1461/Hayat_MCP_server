/**
 * UpdateInclude Handler - Update Existing ABAP Include Source Code
 *
 * Workflow: lock (parent program) -> update (include source) -> unlock (parent program) -> activate (optional)
 * Note: Includes must be locked via their parent program in SAP ADT.
 * The entire lock->update->unlock cycle runs in a single stateful session.
 */

import { XMLParser } from 'fast-xml-parser';
import type { HandlerContext } from '../../../lib/handlers/interfaces';
import {
  encodeSapObjectName,
  isCloudConnection,
  makeAdtRequestWithTimeout,
  return_error,
  return_response,
} from '../../../lib/utils';

const ACCEPT_LOCK =
  'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9';

export const TOOL_DEFINITION = {
  name: 'UpdateInclude',
  available_in: ['onprem', 'legacy'] as const,
  description:
    'Update source code of an existing ABAP include. Locks the parent program, uploads new include source code, unlocks, and optionally activates. Use this for program includes (TOP includes, selection screen includes, etc.) that cannot be updated via UpdateProgram.',
  inputSchema: {
    type: 'object',
    properties: {
      include_name: {
        type: 'string',
        description:
          'Include name (e.g., Z_MY_PROGRAM_I01). Include must already exist.',
      },
      parent_program: {
        type: 'string',
        description:
          'Parent program name that owns this include (e.g., Z_MY_PROGRAM). Required for locking.',
      },
      source_code: {
        type: 'string',
        description: 'Complete ABAP include source code.',
      },
      transport_request: {
        type: 'string',
        description:
          'Transport request number (e.g., S4DK990474). Required for transportable packages.',
      },
      activate: {
        type: 'boolean',
        description: 'Activate include after source update. Default: false.',
      },
    },
    required: ['include_name', 'parent_program', 'source_code'],
  },
} as const;

interface UpdateIncludeArgs {
  include_name: string;
  parent_program: string;
  source_code: string;
  transport_request?: string;
  activate?: boolean;
}

export async function handleUpdateInclude(
  context: HandlerContext,
  params: any,
) {
  const { connection, logger } = context;
  const args: UpdateIncludeArgs = params;

  if (!args.include_name || !args.parent_program || !args.source_code) {
    return return_error(
      new Error(
        'Missing required parameters: include_name, parent_program and source_code',
      ),
    );
  }

  if (isCloudConnection()) {
    return return_error(
      new Error(
        'Includes are not available on cloud systems (ABAP Cloud). This operation is only supported on on-premise systems.',
      ),
    );
  }

  const includeName = args.include_name.toUpperCase();
  const parentProgram = args.parent_program.toUpperCase();
  const encodedInclude = encodeSapObjectName(includeName).toLowerCase();
  const shouldActivate = args.activate === true;

  logger?.info(
    `Starting include source update: ${includeName} (parent=${parentProgram}, activate=${shouldActivate})`,
  );

  try {
    let lockHandle: string | undefined;

    try {
      // Keep entire lock→update→unlock in a single stateful session
      connection.setSessionType('stateful');

      // Step 1: Lock the INCLUDE directly (in stateful session)
      logger?.debug(`Locking include: ${includeName}`);
      let lockUrl = `/sap/bc/adt/programs/includes/${encodedInclude}?_action=LOCK&accessMode=MODIFY`;
      if (args.transport_request) {
        lockUrl += `&corrNr=${args.transport_request}`;
      }

      const lockResponse = await makeAdtRequestWithTimeout(
        connection,
        lockUrl,
        'POST',
        'default',
        null,
        undefined,
        { Accept: ACCEPT_LOCK },
      );

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
      });
      const lockResult = parser.parse(lockResponse.data);
      lockHandle = lockResult?.['asx:abap']?.['asx:values']?.DATA?.LOCK_HANDLE;

      if (!lockHandle) {
        throw new Error(
          'Failed to obtain lock handle. Include may be locked by another user.',
        );
      }
      logger?.debug(
        `Include locked: ${includeName} (handle=${lockHandle.substring(0, 8)}...)`,
      );

      // Step 2: Upload include source code (same stateful session)
      logger?.debug(`Updating include source code: ${includeName}`);
      let updateUrl = `/sap/bc/adt/programs/includes/${encodedInclude}/source/main?lockHandle=${encodeURIComponent(lockHandle)}`;
      if (args.transport_request) {
        updateUrl += `&corrNr=${args.transport_request}`;
      }

      await makeAdtRequestWithTimeout(
        connection,
        updateUrl,
        'PUT',
        'default',
        args.source_code,
        undefined,
        {
          'Content-Type': 'text/plain; charset=utf-8',
          Accept: 'text/plain',
        },
      );
      logger?.info(`Include source code updated: ${includeName}`);
    } finally {
      // Step 3: Unlock the include (same stateful session)
      if (lockHandle) {
        try {
          logger?.debug(`Unlocking include: ${includeName}`);
          const unlockUrl = `/sap/bc/adt/programs/includes/${encodedInclude}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`;
          await makeAdtRequestWithTimeout(
            connection,
            unlockUrl,
            'POST',
            'default',
            null,
          );
          logger?.info(`Include unlocked: ${includeName}`);
        } catch (unlockError: any) {
          logger?.warn(
            `Failed to unlock include ${includeName}: ${unlockError?.message || unlockError}`,
          );
        }
      }
      // Always return to stateless after lock/unlock cycle
      connection.setSessionType('stateless');
    }

    // Step 4: Activate if requested
    let activationWarnings: string[] = [];
    if (shouldActivate) {
      logger?.debug(`Activating include: ${includeName}`);
      try {
        const activateUrl = '/sap/bc/adt/activation';
        const activateBody = `<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:uri="/sap/bc/adt/programs/includes/${encodedInclude}" adtcore:name="${includeName}"/>
</adtcore:objectReferences>`;

        const activateResponse = await makeAdtRequestWithTimeout(
          connection,
          activateUrl,
          'POST',
          'default',
          activateBody,
          { method: 'activate', preauditRequested: 'true' },
          {
            'Content-Type': 'application/xml',
            Accept: 'application/xml',
          },
        );

        // Parse activation warnings
        if (
          activateResponse?.data &&
          typeof activateResponse.data === 'string' &&
          activateResponse.data.includes('<chkl:messages')
        ) {
          const warnParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
          });
          const warnResult = warnParser.parse(activateResponse.data);
          const messages = warnResult?.['chkl:messages']?.msg;
          if (messages) {
            const msgArray = Array.isArray(messages) ? messages : [messages];
            activationWarnings = msgArray.map(
              (msg: any) =>
                `${msg['@_type']}: ${msg.shortText?.txt || 'Unknown'}`,
            );
          }
        }

        logger?.info(`Include activated: ${includeName}`);
      } catch (activationError: any) {
        logger?.error(
          `Activation failed: ${includeName} - ${activationError instanceof Error ? activationError.message : String(activationError)}`,
        );
        throw new Error(
          `Activation failed: ${activationError instanceof Error ? activationError.message : String(activationError)}`,
        );
      }
    }

    logger?.info(`UpdateInclude completed successfully: ${includeName}`);

    const result = {
      success: true,
      include_name: includeName,
      parent_program: parentProgram,
      activated: shouldActivate,
      message: shouldActivate
        ? `Include ${includeName} updated and activated successfully`
        : `Include ${includeName} updated successfully (not activated)`,
      uri: `/sap/bc/adt/programs/includes/${encodedInclude}`,
      steps_completed: [
        'lock_parent',
        'update_include',
        'unlock_parent',
        ...(shouldActivate ? ['activate'] : []),
      ],
      activation_warnings:
        activationWarnings.length > 0 ? activationWarnings : undefined,
      source_size_bytes: args.source_code.length,
    };

    return return_response({
      data: JSON.stringify(result, null, 2),
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });
  } catch (error: any) {
    let errorMessage = error instanceof Error ? error.message : String(error);

    // Attempt to parse ADT XML error
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });
      const errorData = error?.response?.data
        ? parser.parse(error.response.data)
        : null;
      const errorMsg =
        errorData?.['exc:exception']?.message?.['#text'] ||
        errorData?.['exc:exception']?.message;
      if (errorMsg) {
        errorMessage = `SAP Error: ${errorMsg}`;
      }
    } catch {
      // ignore parse errors
    }

    logger?.error(
      `Error updating include source ${includeName}: ${errorMessage}`,
    );
    return return_error(
      new Error(`Failed to update include ${includeName}: ${errorMessage}`),
    );
  }
}
