export type HrDdicObjectType =
  | 'DOMAIN'
  | 'DTEL'
  | 'STRUCTURE'
  | 'TABLE'
  | 'TTYP';

export interface HrDdicFixedValue {
  low: string;
  high?: string;
  ddtext: string;
}

export interface HrDdicDomainSpec {
  description: string;
  datatype: string;
  leng: number;
  decimals?: number;
  outputlen?: number;
  convexit?: string;
  lowercase?: boolean;
  value_table?: string;
  fixed_values?: HrDdicFixedValue[];
}

export interface HrDdicDtelSpec {
  description: string;
  domname: string;
  headlen?: number;
  scrlen1?: number;
  scrlen2?: number;
  scrlen3?: number;
  reptext?: string;
  scrtext_s?: string;
  scrtext_m?: string;
  scrtext_l?: string;
}

/**
 * ABAP-aligned field shape for the Z_HAYAT_DDIC_CREATE dispatcher.
 * Field names mirror the ABAP `ty_field` structure (FLAG components),
 * not TS booleans — so the camelCase JSON deserializer in /ui2/cl_json
 * matches them on the FM side.
 */
export interface HrDdicField {
  fieldname: string;
  rollname: string;
  /** 'X' = key field, '' / omitted = data field */
  keyflag?: string;
  /** 'X' = NOT NULL, '' / omitted = nullable */
  notnull?: string;
  reftable?: string;
  reffield?: string;
}

export interface HrDdicInclude {
  structure: string;
  suffix?: string;
}

export interface HrDdicStructureSpec {
  description: string;
  fields?: HrDdicField[];
  includes?: HrDdicInclude[];
}

export interface HrDdicTableSpec {
  description: string;
  delivery_class: string;
  data_maintenance: string;
  fields: HrDdicField[];
  includes?: HrDdicInclude[];
}

export interface HrDdicTtypSpec {
  description: string;
  rowtype: string;
  rowkind?: string;
  accessmode?: string;
  keykind?: string;
}

export type HrDdicSpec =
  | HrDdicDomainSpec
  | HrDdicDtelSpec
  | HrDdicStructureSpec
  | HrDdicTableSpec
  | HrDdicTtypSpec;

export interface HrDdicLogEntry {
  type: string;
  message: string;
}

export interface HrDdicResult {
  success: boolean;
  message: string;
  log: HrDdicLogEntry[];
}
