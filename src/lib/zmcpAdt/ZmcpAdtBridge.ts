import WebSocket from 'ws';
import type { HrDdicLogEntry, HrDdicResult } from '../hrDdic/types';

const SERVICE_PATH = '/sap/bc/apc/sap/zmcp_adt';
const DEFAULT_TIMEOUT_MS = 30_000;

export interface ZmcpAdtCallArgs {
  fmName: string;
  params: Record<string, unknown>;
  timeoutMs?: number;
}

interface ZmcpAdtRawResponse {
  success?: boolean | string;
  message?: string;
  result?: string;
  log?: Array<{ type?: string; message?: string }>;
}

/**
 * WebSocket client for the ZMCP_ADT_CL01 APC service on HR / legacy SAP
 * systems. Mirrors the {@link HrDdicDispatcherClient} contract so it can
 * serve as a drop-in transport when `SAP_USE_ZMCP_ADT_WS_BRIDGE=true`.
 *
 * Wire protocol (request):  `{ "fm_name": "<FM>", "params": "<JSON>" }`
 * Wire protocol (response): `{ "success": true|false, "message": "...",
 *   "result": "<inner JSON serialised by Z_HAYAT_DDIC_CREATE>",
 *   "log":[{type,message}, ...] }`
 *
 * The ABAP class wraps each call in a fresh on_message handler instance
 * (stateless), so creating one bridge per request is cheap and avoids
 * shared connection state.
 */
export class ZmcpAdtBridge {
  constructor(
    private readonly url: string,
    private readonly username: string,
    private readonly password: string,
    private readonly client?: string,
    private readonly language?: string,
  ) {}

  static fromEnv(): ZmcpAdtBridge {
    const sapUrl = process.env.SAP_URL ?? '';
    const username = process.env.SAP_USERNAME ?? '';
    const password = process.env.SAP_PASSWORD ?? '';
    const client = process.env.SAP_CLIENT;
    const language = process.env.SAP_LANGUAGE;
    if (!sapUrl || !username || !password) {
      throw new Error(
        'ZmcpAdtBridge: SAP_URL / SAP_USERNAME / SAP_PASSWORD are required',
      );
    }
    const wsUrl =
      sapUrl.replace(/^http(s?):\/\//i, (_, secure) =>
        secure ? 'wss://' : 'ws://',
      ) + SERVICE_PATH;
    return new ZmcpAdtBridge(wsUrl, username, password, client, language);
  }

  /**
   * Invokes the dispatcher FM through the websocket and folds the
   * response into the {@link HrDdicResult} shape expected by the
   * existing handler call sites.
   */
  async call(args: ZmcpAdtCallArgs): Promise<HrDdicResult> {
    const raw = await this.sendRaw(
      args.fmName,
      JSON.stringify(args.params),
      args.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    return foldResponse(raw);
  }

  private sendRaw(
    fmName: string,
    paramsJson: string,
    timeoutMs: number,
  ): Promise<ZmcpAdtRawResponse> {
    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {
        Authorization:
          'Basic ' +
          Buffer.from(`${this.username}:${this.password}`).toString('base64'),
      };
      const params = new URLSearchParams();
      if (this.client) params.set('sap-client', this.client);
      if (this.language) params.set('sap-language', this.language);
      const fullUrl = params.toString()
        ? `${this.url}?${params.toString()}`
        : this.url;

      const ws = new WebSocket(fullUrl, {
        headers,
        rejectUnauthorized: false,
      });

      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
        try {
          ws.close();
        } catch {
          /* noop */
        }
      };

      const timer = setTimeout(() => {
        settle(() =>
          reject(new Error(`ZmcpAdtBridge: timeout after ${timeoutMs}ms`)),
        );
        try {
          ws.terminate();
        } catch {
          /* noop */
        }
      }, timeoutMs);

      ws.on('open', () => {
        try {
          ws.send(JSON.stringify({ fm_name: fmName, params: paramsJson }));
        } catch (err) {
          settle(() => reject(err as Error));
        }
      });

      ws.on('message', (data: WebSocket.RawData) => {
        const text =
          typeof data === 'string'
            ? data
            : Buffer.from(data as Buffer).toString('utf8');
        let parsed: ZmcpAdtRawResponse;
        try {
          parsed = JSON.parse(text) as ZmcpAdtRawResponse;
        } catch (err) {
          settle(() => reject(err as Error));
          return;
        }
        settle(() => resolve(parsed));
      });

      ws.on('error', (err: Error) => {
        settle(() => reject(err));
      });

      ws.on('close', () => {
        settle(() =>
          reject(new Error('ZmcpAdtBridge: connection closed before response')),
        );
      });
    });
  }
}

/**
 * Translates the websocket envelope into an {@link HrDdicResult}.
 * Inner FM result (from Z_HAYAT_DDIC_CREATE) takes precedence over the
 * outer dispatcher status for success / message determination.
 */
function foldResponse(raw: ZmcpAdtRawResponse): HrDdicResult {
  const log: HrDdicLogEntry[] = [];
  for (const entry of raw.log ?? []) {
    if (entry && typeof entry === 'object') {
      log.push({
        type: String(entry.type ?? ''),
        message: String(entry.message ?? ''),
      });
    }
  }

  const outerSuccess = isTruthyAbap(raw.success);
  const outerMessage = (raw.message ?? '').trim();

  if (raw.result && typeof raw.result === 'string') {
    try {
      const inner = JSON.parse(raw.result) as Record<string, unknown>;
      const evSuccessRaw = inner.evSuccess ?? inner.EV_SUCCESS;
      const evMessageRaw = inner.evMessage ?? inner.EV_MESSAGE;
      const etLogRaw = (inner.etLog ?? inner.ET_LOG) as
        | Array<Record<string, unknown>>
        | undefined;

      if (Array.isArray(etLogRaw)) {
        for (const row of etLogRaw) {
          log.push({
            type: String(row.type ?? row.TYPE ?? ''),
            message: String(row.message ?? row.MESSAGE ?? ''),
          });
        }
      }

      const evSuccess = isTruthyAbap(evSuccessRaw);
      const evMessage = String(evMessageRaw ?? '').trim();

      return {
        success: evSuccess,
        message:
          evMessage ||
          outerMessage ||
          (evSuccess ? 'OK' : 'Dispatcher reported failure'),
        log,
      };
    } catch {
      /* fall through to outer fields */
    }
  }

  return {
    success: outerSuccess,
    message:
      outerMessage || (outerSuccess ? 'OK' : 'Dispatcher reported failure'),
    log,
  };
}

function isTruthyAbap(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string')
    return value.toUpperCase() === 'X' || value === 'true' || value === '1';
  return Boolean(value);
}
