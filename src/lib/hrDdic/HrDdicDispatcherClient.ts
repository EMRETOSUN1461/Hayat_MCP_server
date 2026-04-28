import { handleCallFunctionModule } from '../../handlers/function/high/handleCallFunctionModule';
import type { HandlerContext } from '../handlers/interfaces';
import { shouldUseZmcpAdtBridge, ZmcpAdtBridge } from '../zmcpAdt';
import type {
  HrDdicLogEntry,
  HrDdicObjectType,
  HrDdicResult,
  HrDdicSpec,
} from './types';

const DISPATCHER_FM = 'Z_HAYAT_DDIC_CREATE';
const DISPATCHER_FG = 'ZHAYAT_DDIC';

export interface HrDdicInvokeArgs {
  objectType: HrDdicObjectType;
  objectName: string;
  packageName: string;
  transportRequest?: string;
  spec: HrDdicSpec;
  activate?: boolean;
}

/**
 * Calls the Z_HAYAT_DDIC_CREATE dispatcher function module on the connected
 * legacy/HR SAP system. Spec is JSON-serialized and passed as IV_SPEC_JSON;
 * the dispatcher deserializes it inside ABAP and invokes the appropriate
 * standard DDIF_*_PUT / DDIF_*_ACTIVATE chain.
 */
export class HrDdicDispatcherClient {
  constructor(private readonly context: HandlerContext) {}

  async invoke(args: HrDdicInvokeArgs): Promise<HrDdicResult> {
    const importing = {
      IV_OBJECT_TYPE: args.objectType,
      IV_OBJECT_NAME: args.objectName.toUpperCase(),
      IV_PACKAGE: args.packageName.toUpperCase(),
      IV_TRANSPORT: args.transportRequest ?? '',
      IV_SPEC_JSON: JSON.stringify(args.spec),
      IV_ACTIVATE: args.activate === false ? '' : 'X',
    };

    if (shouldUseZmcpAdtBridge()) {
      const bridge = ZmcpAdtBridge.fromEnv();
      return bridge.call({ fmName: DISPATCHER_FM, params: importing });
    }

    const fmResult = await handleCallFunctionModule(this.context, {
      function_module_name: DISPATCHER_FM,
      function_group_name: DISPATCHER_FG,
      importing,
    });

    return parseDispatcherResult(fmResult);
  }
}

/**
 * `handleCallFunctionModule` returns the AxiosResponse-shaped envelope from
 * `return_response` / `return_error`. Its `data` field carries a JSON string
 * with `export_parameters` containing EV_SUCCESS, EV_MESSAGE, ET_LOG.
 */
function parseDispatcherResult(fmResult: any): HrDdicResult {
  const log: HrDdicLogEntry[] = [];

  const envelope = unwrapEnvelope(fmResult);
  if (!envelope) {
    return {
      success: false,
      message: 'Z_HAYAT_DDIC_CREATE call returned no payload',
      log,
    };
  }

  if (envelope.isError) {
    return {
      success: false,
      message: envelope.errorText ?? 'Z_HAYAT_DDIC_CREATE call failed',
      log,
    };
  }

  const exportParams = envelope.payload?.export_parameters ?? {};
  const success = String(exportParams.EV_SUCCESS ?? '').toUpperCase() === 'X';
  const message = String(exportParams.EV_MESSAGE ?? '').trim();
  const rawLog = exportParams.ET_LOG;

  if (Array.isArray(rawLog)) {
    for (const row of rawLog) {
      if (row && typeof row === 'object') {
        log.push({
          type: String((row as any).TYPE ?? ''),
          message: String((row as any).MESSAGE ?? ''),
        });
      }
    }
  }

  return {
    success,
    message: message || (success ? 'OK' : 'Dispatcher reported failure'),
    log,
  };
}

function unwrapEnvelope(fmResult: any): {
  isError: boolean;
  errorText?: string;
  payload?: any;
} | null {
  if (!fmResult) return null;

  // return_error path: { isError: true, content: [{ type: 'text', text: '...' }] }
  if (fmResult.isError === true) {
    const text = Array.isArray(fmResult.content) && fmResult.content[0]?.text;
    return {
      isError: true,
      errorText: typeof text === 'string' ? text : undefined,
    };
  }

  // return_response path: { content: [{ type: 'text', text: '<json>' }] }
  const text = Array.isArray(fmResult.content) && fmResult.content[0]?.text;
  if (typeof text !== 'string') return null;

  try {
    return { isError: false, payload: JSON.parse(text) };
  } catch {
    return {
      isError: true,
      errorText: `Unparseable dispatcher response: ${text.slice(0, 200)}`,
    };
  }
}
