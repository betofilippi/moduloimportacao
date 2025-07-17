/**
 * NocoDB Utility Functions
 */

import { NocoDBQueryParams, NocoDBFilter } from '@/types/nocodb';

/**
 * Build a where clause for NocoDB queries
 * @param filters Array of filter conditions
 * @returns Formatted where string
 * 
 * @example
 * buildWhereClause([
 *   { field: 'status', op: 'eq', value: 'active' },
 *   { field: 'amount', op: 'gt', value: 100 }
 * ])
 * // Returns: "(status,eq,active)~and(amount,gt,100)"
 */
export function buildWhereClause(
  filters: Array<{
    field: string;
    op: 'eq' | 'neq' | 'null' | 'notnull' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'nlike';
    value?: any;
    logic?: 'and' | 'or';
  }>
): string {
  if (!filters.length) return '';

  return filters
    .map((filter, index) => {
      const condition = filter.value !== undefined 
        ? `(${filter.field},${filter.op},${filter.value})`
        : `(${filter.field},${filter.op})`;
      
      if (index === 0) return condition;
      
      const logic = filters[index - 1].logic || 'and';
      return `~${logic}${condition}`;
    })
    .join('');
}

/**
 * Build sort parameter for NocoDB queries
 * @param sorts Array of sort configurations
 * @returns Formatted sort string
 * 
 * @example
 * buildSortParam([
 *   { field: 'created_at', direction: 'desc' },
 *   { field: 'name', direction: 'asc' }
 * ])
 * // Returns: "-created_at,name"
 */
export function buildSortParam(
  sorts: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>
): string {
  return sorts
    .map(sort => (sort.direction === 'desc' ? '-' : '') + sort.field)
    .join(',');
}

/**
 * Build query parameters for NocoDB API
 * @param options Query options
 * @returns Formatted query parameters
 */
export function buildQueryParams(options: {
  page?: number;
  pageSize?: number;
  filters?: Parameters<typeof buildWhereClause>[0];
  sorts?: Parameters<typeof buildSortParam>[0];
  fields?: string[];
}): NocoDBQueryParams {
  const params: NocoDBQueryParams = {};

  if (options.page !== undefined && options.pageSize !== undefined) {
    params.offset = (options.page - 1) * options.pageSize;
    params.limit = options.pageSize;
  }

  if (options.filters?.length) {
    params.where = buildWhereClause(options.filters);
  }

  if (options.sorts?.length) {
    params.sort = buildSortParam(options.sorts);
  }

  if (options.fields?.length) {
    params.fields = options.fields.join(',');
  }

  return params;
}

/**
 * Format date for NocoDB
 * @param date Date to format
 * @returns ISO string format
 */
export function formatDateForNocoDB(date: Date | string): string {
  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }
  return date.toISOString();
}

/**
 * Parse NocoDB date
 * @param dateString Date string from NocoDB
 * @returns Date object
 */
export function parseNocoDBDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Sanitize data for NocoDB
 * Removes undefined values and converts dates
 * @param data Data to sanitize
 * @returns Sanitized data
 */
export function sanitizeForNocoDB(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }

    if (value instanceof Date) {
      sanitized[key] = formatDateForNocoDB(value);
    } else if (value === null) {
      sanitized[key] = null;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Build pagination info from NocoDB response
 * @param response NocoDB response
 * @param page Current page (1-indexed)
 * @param pageSize Items per page
 * @returns Pagination info
 */
export function buildPaginationInfo(response: {
  pageInfo?: {
    totalRows: number;
    page: number;
    pageSize: number;
  };
  list: any[];
}, page: number, pageSize: number) {
  const totalRows = response.pageInfo?.totalRows || response.list.length;
  const totalPages = Math.ceil(totalRows / pageSize);

  return {
    page,
    pageSize,
    totalRows,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Extract table ID from NocoDB URL
 * @param url NocoDB table URL
 * @returns Table ID or null
 * 
 * @example
 * extractTableId('https://app.nocodb.com/base/abc123/table/tbl_xyz789')
 * // Returns: 'tbl_xyz789'
 */
export function extractTableId(url: string): string | null {
  const match = url.match(/table\/(tbl_[a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Check if a value is a valid NocoDB ID
 * @param id Value to check
 * @returns Boolean indicating if valid
 */
export function isValidNocoDBId(id: any): boolean {
  if (typeof id === 'string') {
    return /^[a-zA-Z0-9_-]+$/.test(id);
  }
  if (typeof id === 'number') {
    return Number.isInteger(id) && id > 0;
  }
  return false;
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Transform object keys from snake_case to camelCase
 */
export function transformKeysToCamel(obj: Record<string, any>): Record<string, any> {
  const transformed: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      transformed[camelKey] = transformKeysToCamel(value);
    } else if (Array.isArray(value)) {
      transformed[camelKey] = value.map(item => 
        item && typeof item === 'object' ? transformKeysToCamel(item) : item
      );
    } else {
      transformed[camelKey] = value;
    }
  }
  
  return transformed;
}

/**
 * Transform object keys from camelCase to snake_case
 */
export function transformKeysToSnake(obj: Record<string, any>): Record<string, any> {
  const transformed: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      transformed[snakeKey] = transformKeysToSnake(value);
    } else if (Array.isArray(value)) {
      transformed[snakeKey] = value.map(item => 
        item && typeof item === 'object' ? transformKeysToSnake(item) : item
      );
    } else {
      transformed[snakeKey] = value;
    }
  }
  
  return transformed;
}