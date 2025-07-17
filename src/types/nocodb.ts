/**
 * NocoDB API Types and Interfaces
 */

// Configuration
export interface NocoDBConfig {
  baseURL: string;
  apiToken: string;
}

// Query Parameters
export interface NocoDBQueryParams {
  offset?: number;
  limit?: number;
  where?: string;
  sort?: string;
  fields?: string;
  viewId?: string;
}

// Response Types
export interface NocoDBResponse<T = any> {
  list: T[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

export interface NocoDBRecord {
  Id?: number | string;
  CreatedAt?: string;
  UpdatedAt?: string;
  [key: string]: any;
}

// Error Response
export interface NocoDBError {
  msg: string;
  status: number;
}

// Bulk Operations
export interface BulkCreateResponse {
  ids: string[];
}

export interface BulkUpdateRequest {
  records: Array<{
    id: string;
    [key: string]: any;
  }>;
}

export interface BulkDeleteRequest {
  ids: string[];
}

// Table Metadata
export interface NocoDBTable {
  id: string;
  title: string;
  table_name: string;
  type: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Column Metadata
export interface NocoDBColumn {
  id: string;
  fk_model_id: string;
  title: string;
  column_name: string;
  uidt: string; // UI Data Type
  dt: string; // Data Type
  np?: number; // Numeric Precision
  ns?: number; // Numeric Scale
  clen?: number; // Character Length
  pk: boolean; // Primary Key
  pv: boolean; // Primary Value
  rqd: boolean; // Required
  un: boolean; // Unsigned
  ai: boolean; // Auto Increment
  unique: boolean;
  created_at: string;
  updated_at: string;
}

// Sort Configuration
export interface NocoDBSort {
  fk_column_id: string;
  direction: 'asc' | 'desc';
}

// Filter Configuration
export interface NocoDBFilter {
  fk_column_id: string;
  comparison_op: 'eq' | 'neq' | 'null' | 'notnull' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'nlike' | 'in' | 'nin';
  value: any;
  logical_op?: 'and' | 'or';
}

// View Types
export interface NocoDBView {
  id: string;
  title: string;
  type: 'grid' | 'form' | 'kanban' | 'gallery' | 'calendar';
  fk_model_id: string;
  show: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

// Hook useNocoDB return type
export interface UseNocoDBReturn {
  loading: boolean;
  error: string | null;
  create: (data: Record<string, any>) => Promise<any>;
  find: (params?: NocoDBQueryParams) => Promise<NocoDBResponse>;
  findOne: (recordId: string) => Promise<NocoDBRecord>;
  update: (recordId: string, data: Record<string, any>) => Promise<any>;
  remove: (recordId: string) => Promise<any>;
  bulkCreate: (records: Record<string, any>[]) => Promise<BulkCreateResponse>;
  bulkUpdate: (records: Array<{id: string; [key: string]: any}>) => Promise<any>;
  bulkDelete: (recordIds: string[]) => Promise<any>;
}