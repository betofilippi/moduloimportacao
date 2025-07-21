/**
 * NocoDB Service
 * Provides methods for interacting with NocoDB API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  NocoDBConfig,
  NocoDBQueryParams,
  NocoDBResponse,
  NocoDBRecord,
  NocoDBError,
  BulkCreateResponse,
  BulkUpdateRequest,
  BulkDeleteRequest,
} from '@/types/nocodb';

export class NocoDBService {
  private api: AxiosInstance;

  constructor(config: NocoDBConfig) {
    this.api = axios.create({
      baseURL: config.baseURL,
      headers: {
        'xc-token': config.apiToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError<NocoDBError>) => {
        if (error.response?.data?.msg) {
          throw new Error(error.response.data.msg);
        }
        throw error;
      }
    );
  }

  /**
   * Create a new record
   */
  async create(tableId: string, data: Record<string, any>): Promise<NocoDBRecord> {
    const response = await this.api.post(`/tables/${tableId}/records`, data);
    return response.data;
  }

  /**
   * Find records with optional query parameters
   */
  async find(tableId: string, params?: NocoDBQueryParams): Promise<NocoDBResponse> {
    const response = await this.api.get(`/tables/${tableId}/records`, { params });
    return response.data;
  }

  /**
   * Find a single record by ID
   */
  async findOne(tableId: string, recordId: string): Promise<NocoDBRecord> {
    const response = await this.api.get(`/tables/${tableId}/records/${recordId}`);
    return response.data;
  }

  /**
   * Update a record
   */
  async update(
    tableId: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<NocoDBRecord> {
    // Include the ID in the data body
    const updateData = { ...data, Id: recordId };
    const response = await this.api.patch(`/tables/${tableId}/records`, updateData);
    return response.data;
  }

  /**
   * Delete a record
   */
  async delete(tableId: string, recordId: string): Promise<void> {
    await this.api.delete(`/tables/${tableId}/records`, {
     data: { Id: recordId }
    });
  }

  /**
   * Bulk create records
   */
  async bulkCreate(
    tableId: string,
    records: Record<string, any>[]
  ): Promise<BulkCreateResponse> {
    const response = await this.api.post(`/tables/${tableId}/records/bulk`, records);
    return response.data;
  }

  /**
   * Bulk update records
   */
  async bulkUpdate(tableId: string, records: BulkUpdateRequest['records']): Promise<any> {
    const response = await this.api.patch(`/tables/${tableId}/records/bulk`, records);
    return response.data;
  }

  /**
   * Bulk delete records
   */
  async bulkDelete(tableId: string, recordIds: string[]): Promise<any> {
    const response = await this.api.delete(`/tables/${tableId}/records/bulk`, {
      data: { ids: recordIds },
    });
    return response.data;
  }

  /**
   * Count records
   */
  async count(tableId: string, where?: string): Promise<number> {
    const response = await this.api.get(`/tables/${tableId}/records/count`, {
      params: { where },
    });
    return response.data.count;
  }

  /**
   * Get table metadata
   */
  async getTableMeta(tableId: string): Promise<any> {
    const response = await this.api.get(`/tables/${tableId}`);
    return response.data;
  }

  /**
   * Get all tables in a base
   */
  async getTables(baseId: string): Promise<any[]> {
    const response = await this.api.get(`/bases/${baseId}/tables`);
    return response.data.list;
  }

  /**
   * Get columns for a table
   */
  async getColumns(tableId: string): Promise<any[]> {
    const response = await this.api.get(`/tables/${tableId}/columns`);
    return response.data.list;
  }

  /**
   * Check if service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.api.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get linked records for a relation
   */
  async getLinkedRecords(
    tableId: string,
    linkId: string,
    recordId: string,
    params?: NocoDBQueryParams
  ): Promise<NocoDBResponse> {
    const response = await this.api.get(
      `/tables/${tableId}/links/${linkId}/records/${recordId}`,
      { params }
    );
    return response.data;
  }

  /**
   * Add linked record
   */
  async addLinkedRecord(
    tableId: string,
    linkId: string,
    recordId: string,
    linkedRecordId: string
  ): Promise<any> {
    const response = await this.api.post(
      `/tables/${tableId}/links/${linkId}/records/${recordId}/${linkedRecordId}`
    );
    return response.data;
  }

  /**
   * Remove linked record
   */
  async removeLinkedRecord(
    tableId: string,
    linkId: string,
    recordId: string,
    linkedRecordId: string
  ): Promise<any> {
    const response = await this.api.delete(
      `/tables/${tableId}/links/${linkId}/records/${recordId}/${linkedRecordId}`
    );
    return response.data;
  }
}