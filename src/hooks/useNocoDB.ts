/**
 * React Hook for NocoDB Operations
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { getNocoDBService, isNocoDBConfigured } from '@/lib/services/nocodb';
import { toast } from 'sonner';
import {
  NocoDBQueryParams,
  NocoDBResponse,
  NocoDBRecord,
  BulkCreateResponse,
  UseNocoDBReturn,
} from '@/types/nocodb';

/**
 * Hook to interact with NocoDB
 * @param tableId - The NocoDB table ID
 * @returns Object with CRUD operations and state
 */
export function useNocoDB(tableId: string): UseNocoDBReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if NocoDB is configured
  useEffect(() => {
    if (!isNocoDBConfigured()) {
      console.warn('NocoDB is not properly configured. Please check your environment variables.');
    }
  }, []);

  /**
   * Create a new record
   */
  const create = useCallback(
    async (data: Record<string, any>) => {
      setLoading(true);
      setError(null);
      
      try {
        const nocodb = getNocoDBService();
        const result = await nocodb.create(tableId, data);
        toast.success('Registro criado com sucesso');
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar registro';
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [tableId]
  );

  /**
   * Find records with optional query parameters
   */
  const find = useCallback(
    async (params?: NocoDBQueryParams): Promise<NocoDBResponse> => {
      setLoading(true);
      setError(null);
      
      try {
        const nocodb = getNocoDBService();
        return await nocodb.find(tableId, params);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar registros';
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [tableId]
  );

  /**
   * Find a single record by ID
   */
  const findOne = useCallback(
    async (recordId: string): Promise<NocoDBRecord> => {
      setLoading(true);
      setError(null);
      
      try {
        const nocodb = getNocoDBService();
        return await nocodb.findOne(tableId, recordId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar registro';
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [tableId]
  );

  /**
   * Update a record
   */
  const update = useCallback(
    async (recordId: string, data: Record<string, any>) => {
      setLoading(true);
      setError(null);
      
      try {
        const nocodb = getNocoDBService();
        const result = await nocodb.update(tableId, recordId, data);
        toast.success('Registro atualizado com sucesso');
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar registro';
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [tableId]
  );

  /**
   * Delete a record
   */
  const remove = useCallback(
    async (recordId: string) => {
      setLoading(true);
      setError(null);
      
      try {
        const nocodb = getNocoDBService();
        await nocodb.delete(tableId, recordId);
        toast.success('Registro excluído com sucesso');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao excluir registro';
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [tableId]
  );

  /**
   * Bulk create records
   */
  const bulkCreate = useCallback(
    async (records: Record<string, any>[]): Promise<BulkCreateResponse> => {
      setLoading(true);
      setError(null);
      
      try {
        const nocodb = getNocoDBService();
        const result = await nocodb.bulkCreate(tableId, records);
        toast.success(`${records.length} registros criados com sucesso`);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar registros em lote';
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [tableId]
  );

  /**
   * Bulk update records
   */
  const bulkUpdate = useCallback(
    async (records: Array<{ id: string; [key: string]: any }>) => {
      setLoading(true);
      setError(null);
      
      try {
        const nocodb = getNocoDBService();
        const result = await nocodb.bulkUpdate(tableId, records);
        toast.success(`${records.length} registros atualizados com sucesso`);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar registros em lote';
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [tableId]
  );

  /**
   * Bulk delete records
   */
  const bulkDelete = useCallback(
    async (recordIds: string[]) => {
      setLoading(true);
      setError(null);
      
      try {
        const nocodb = getNocoDBService();
        const result = await nocodb.bulkDelete(tableId, recordIds);
        toast.success(`${recordIds.length} registros excluídos com sucesso`);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao excluir registros em lote';
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [tableId]
  );

  return {
    loading,
    error,
    create,
    find,
    findOne,
    update,
    remove,
    bulkCreate,
    bulkUpdate,
    bulkDelete,
  };
}