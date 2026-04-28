/**
 * ZmcpAdt WebSocket bridge routing.
 *
 * When enabled, HrDdic dispatcher calls bypass the
 * `handleCallFunctionModule` (program-update + execute via
 * ZAI_MCP_FM_CALLER + ZAI_MCP_OUTPUT) path and route directly through
 * the APC WebSocket service `/sap/bc/apc/sap/zmcp_adt`, served by
 * ZMCP_ADT_CL01. This is faster, has no DB-table dependency, and
 * keeps the same `Z_HAYAT_DDIC_CREATE` dispatcher contract on the
 * ABAP side.
 *
 * Sources of truth:
 *   1. SAP_USE_ZMCP_ADT_WS_BRIDGE=true|false explicit override
 *      (default: false — opt-in until field-tested across HR systems)
 */
export function shouldUseZmcpAdtBridge(): boolean {
  const override = process.env.SAP_USE_ZMCP_ADT_WS_BRIDGE?.toLowerCase();
  return override === 'true' || override === '1';
}
