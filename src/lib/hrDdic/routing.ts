import { getSystemContext } from '../systemContext';

/**
 * HR DDIC dispatcher routing.
 *
 * Returns true when the current SAP connection is a legacy/HR system that
 * lacks ADT REST endpoints for DDIC create operations. In that case the
 * Create* handlers must call the Z_HAYAT_DDIC_CREATE function module via
 * RFC instead of the standard ADT builders.
 *
 * Sources of truth (in priority order):
 *   1. SAP_USE_HR_DDIC_DISPATCHER=true|false explicit override
 *   2. systemContext.isLegacy (driven by SAP_SYSTEM_TYPE=legacy)
 */
export function shouldUseHrDdicDispatcher(): boolean {
  const override = process.env.SAP_USE_HR_DDIC_DISPATCHER?.toLowerCase();
  if (override === 'true' || override === '1') return true;
  if (override === 'false' || override === '0') return false;

  const ctx = getSystemContext();
  return ctx.isLegacy === true;
}

/**
 * Detect whether an ADT error indicates that the target system does not
 * expose the DDIC REST endpoints (e.g. HR / legacy systems). This lets the
 * Create* handlers fall back to the dispatcher path automatically when the
 * env-based routing has not been configured.
 *
 * Heuristic (status-agnostic, because the adt-clients wrapper does not
 * always preserve `response.status`): inspect every textual surface on the
 * error object for a missing `/sap/bc/adt/ddic/...` path or the SAP
 * `ExceptionResourceNotFound` exception type.
 */
export function isDdicAdtUnavailableError(error: any): boolean {
  if (!error) return false;

  const surfaces: string[] = [];
  if (typeof error?.message === 'string') surfaces.push(error.message);
  if (typeof error?.toString === 'function') {
    try {
      surfaces.push(error.toString());
    } catch {
      // ignore
    }
  }
  const data = error?.response?.data;
  if (typeof data === 'string') {
    surfaces.push(data);
  } else if (data && typeof data === 'object') {
    try {
      surfaces.push(JSON.stringify(data));
    } catch {
      surfaces.push(String(data));
    }
  }

  const haystack = surfaces.join(' ').toLowerCase();
  if (!haystack) return false;

  const mentionsDdicPath = haystack.includes('/sap/bc/adt/ddic/');
  const mentionsResourceNotFound = haystack.includes(
    'exceptionresourcenotfound',
  );
  const mentionsDoesNotExist =
    haystack.includes('does not exist') &&
    (haystack.includes('ddic') ||
      haystack.includes('domain') ||
      haystack.includes('table') ||
      haystack.includes('structure') ||
      haystack.includes('data element') ||
      haystack.includes('rollname'));

  return mentionsDdicPath || mentionsResourceNotFound || mentionsDoesNotExist;
}
