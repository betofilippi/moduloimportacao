/**
 * React Hook for Document Save Operations
 *
 * Provides a simple interface for saving documents to NocoDB
 * with loading states, error handling, and toast notifications
 */

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  getDocumentSaveService,
  SaveOptions,
  SaveResult,
} from "@/services/documents/DocumentSaveService";
import { useAuth } from "@/contexts/auth-context";

export interface UseDocumentSaveReturn {
  saving: boolean;
  error: string | null;
  lastSaveResult: SaveResult | null;
  saveDocument: (
    documentType: string,
    data: any,
    options?: SaveOptions
  ) => Promise<SaveResult>;
  saveDI: (data: any, options?: SaveOptions) => Promise<SaveResult>;
  saveCommercialInvoice: (
    data: any,
    options?: SaveOptions
  ) => Promise<SaveResult>;
  savePackingList: (data: any, options?: SaveOptions) => Promise<SaveResult>;
  saveProformaInvoice: (
    data: any,
    options?: SaveOptions
  ) => Promise<SaveResult>;
  saveSwift: (data: any, options?: SaveOptions) => Promise<SaveResult>;
  saveNumerario: (data: any, options?: SaveOptions) => Promise<SaveResult>;
  saveNotaFiscal: (data: any, options?: SaveOptions) => Promise<SaveResult>;
  updateDI: (data: any, fileHash: string) => Promise<SaveResult>;
  updateCommercialInvoice: (data: any, fileHash: string) => Promise<SaveResult>;
  updatePackingList: (data: any, fileHash: string) => Promise<SaveResult>;
  updateProformaInvoice: (data: any, fileHash: string) => Promise<SaveResult>;
  updateSwift: (data: any, fileHash: string) => Promise<SaveResult>;
  updateNumerario: (data: any, fileHash: string) => Promise<SaveResult>;
  updateNotaFiscal: (data: any, fileHash: string) => Promise<SaveResult>;
  resetDocumentData: (
    fileHash: string,
    documentType: string
  ) => Promise<SaveResult>;
  clearError: () => void;
}

export function useDocumentSave(): UseDocumentSaveReturn {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaveResult, setLastSaveResult] = useState<SaveResult | null>(null);
  const { user } = useAuth();

  const documentSaveService = getDocumentSaveService();

  const handleSave = useCallback(
    async (
      saveFunction: () => Promise<SaveResult>,
      documentTypeName: string
    ): Promise<SaveResult> => {
      setSaving(true);
      setError(null);

      try {
        const result = await saveFunction();
        setLastSaveResult(result);

        if (result.success) {
          toast.success(`${documentTypeName} salvo com sucesso!`, {
            description: `ID: ${result.documentId}`,
          });

          // Save audit log
          if (result.documentId) {
            await documentSaveService.saveAuditLog(
              "create",
              documentTypeName,
              result.documentId,
              user?.email || "anonymous",
              result.details
            );
          }
        } else {
          const errorMessage =
            result.error || "Erro desconhecido ao salvar documento";
          setError(errorMessage);
          toast.error(`Erro ao salvar ${documentTypeName}`, {
            description: errorMessage,
          });
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao salvar documento";
        setError(errorMessage);
        toast.error(`Erro ao salvar ${documentTypeName}`, {
          description: errorMessage,
        });

        const errorResult: SaveResult = {
          success: false,
          error: errorMessage,
        };
        setLastSaveResult(errorResult);
        return errorResult;
      } finally {
        setSaving(false);
      }
    },
    [documentSaveService, user]
  );

  const saveDocument = useCallback(
    async (
      documentType: string,
      data: any,
      options?: SaveOptions
    ): Promise<SaveResult> => {
      const saveOptions = {
        ...options,
        userId: user?.email || options?.userId || "anonymous",
      };

      return handleSave(
        () => documentSaveService.saveDocument(documentType, data, saveOptions),
        documentType
      );
    },
    [documentSaveService, handleSave, user]
  );

  const saveDI = useCallback(
    async (data: any, options?: SaveOptions): Promise<SaveResult> => {
      const saveOptions = {
        ...options,
        userId: user?.email || options?.userId || "anonymous",
      };

      return handleSave(
        () => documentSaveService.saveDI(data, saveOptions),
        "DI"
      );
    },
    [documentSaveService, handleSave, user]
  );

  const saveCommercialInvoice = useCallback(
    async (data: any, options?: SaveOptions): Promise<SaveResult> => {
      const saveOptions = {
        ...options,
        userId: user?.email || options?.userId || "anonymous",
      };

      return handleSave(
        () => documentSaveService.saveCommercialInvoice(data, saveOptions),
        "Commercial Invoice"
      );
    },
    [documentSaveService, handleSave, user]
  );

  const savePackingList = useCallback(
    async (data: any, options?: SaveOptions): Promise<SaveResult> => {
      const saveOptions = {
        ...options,
        userId: user?.email || options?.userId || "anonymous",
      };

      return handleSave(
        () => documentSaveService.savePackingList(data, saveOptions),
        "Packing List"
      );
    },
    [documentSaveService, handleSave, user]
  );

  const saveProformaInvoice = useCallback(
    async (data: any, options?: SaveOptions): Promise<SaveResult> => {
      const saveOptions = {
        ...options,
        userId: user?.email || options?.userId || "anonymous",
      };

      return handleSave(
        () => documentSaveService.saveProformaInvoice(data, saveOptions),
        "Proforma Invoice"
      );
    },
    [documentSaveService, handleSave, user]
  );

  const saveSwift = useCallback(
    async (data: any, options?: SaveOptions): Promise<SaveResult> => {
      const saveOptions = {
        ...options,
        userId: user?.email || options?.userId || "anonymous",
      };

      return handleSave(
        () => documentSaveService.saveSwift(data, saveOptions),
        "Swift"
      );
    },
    [documentSaveService, handleSave, user]
  );

  const saveNumerario = useCallback(
    async (data: any, options?: SaveOptions): Promise<SaveResult> => {
      const saveOptions = {
        ...options,
        userId: user?.email || options?.userId || "anonymous",
      };

      return handleSave(
        () => documentSaveService.saveNumerario(data, saveOptions),
        "Numerário"
      );
    },
    [documentSaveService, handleSave, user]
  );

  const saveNotaFiscal = useCallback(
    async (data: any, options?: SaveOptions): Promise<SaveResult> => {
      const saveOptions = {
        ...options,
        userId: user?.email || options?.userId || "anonymous",
      };

      return handleSave(
        () => documentSaveService.saveNotaFiscal(data, saveOptions),
        "Nota Fiscal"
      );
    },
    [documentSaveService, handleSave, user]
  );

  const resetDocumentData = useCallback(
    async (fileHash: string, documentType: string): Promise<SaveResult> => {
      setSaving(true);
      setError(null);

      try {
        const result = await documentSaveService.resetDocumentData(
          fileHash,
          documentType
        );

        if (result.success) {
          toast.success("Dados resetados com sucesso!", {
            description: "O documento pode ser processado novamente.",
          });

          // Save audit log
          await documentSaveService.saveAuditLog(
            "delete",
            documentType,
            fileHash,
            user?.email || "anonymous",
            { action: "reset_document_data" }
          );

          // Clear last save result since data was reset
          setLastSaveResult(null);
        } else {
          const errorMessage = result.error || "Erro ao resetar dados";
          setError(errorMessage);
          toast.error("Erro ao resetar dados", {
            description: errorMessage,
          });
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao resetar documento";
        setError(errorMessage);
        toast.error("Erro ao resetar dados", {
          description: errorMessage,
        });

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setSaving(false);
      }
    },
    [documentSaveService, user]
  );

  const handleUpdate = useCallback(
    async (
      updateFunction: () => Promise<SaveResult>,
      documentTypeName: string
    ): Promise<SaveResult> => {
      setSaving(true);
      setError(null);

      try {
        const result = await updateFunction();
        setLastSaveResult(result);

        if (result.success) {
          toast.success(`${documentTypeName} atualizado com sucesso!`, {
            description: `ID: ${result.documentId}`,
          });

          // Save audit log
          if (result.documentId) {
            await documentSaveService.saveAuditLog(
              "update",
              documentTypeName,
              result.documentId,
              user?.email || "anonymous",
              result.details
            );
          }
        } else {
          const errorMessage =
            result.error || "Erro desconhecido ao atualizar documento";
          setError(errorMessage);
          toast.error(`Erro ao atualizar ${documentTypeName}`, {
            description: errorMessage,
          });
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao atualizar documento";
        setError(errorMessage);
        toast.error(`Erro ao atualizar ${documentTypeName}`, {
          description: errorMessage,
        });

        const errorResult: SaveResult = {
          success: false,
          error: errorMessage,
        };
        setLastSaveResult(errorResult);
        return errorResult;
      } finally {
        setSaving(false);
      }
    },
    [documentSaveService, user]
  );

  const updateDI = useCallback(
    async (data: any, fileHash: string): Promise<SaveResult> => {
      return handleUpdate(
        () => documentSaveService.updateDI(data, fileHash),
        "DI"
      );
    },
    [documentSaveService, handleUpdate]
  );

  const updateCommercialInvoice = useCallback(
    async (data: any, fileHash: string): Promise<SaveResult> => {
      return handleUpdate(
        () => documentSaveService.updateCommercialInvoice(data, fileHash),
        "Commercial Invoice"
      );
    },
    [documentSaveService, handleUpdate]
  );

  const updatePackingList = useCallback(
    async (data: any, fileHash: string): Promise<SaveResult> => {
      return handleUpdate(
        () => documentSaveService.updatePackingList(data, fileHash),
        "Packing List"
      );
    },
    [documentSaveService, handleUpdate]
  );

  const updateProformaInvoice = useCallback(
    async (data: any, fileHash: string): Promise<SaveResult> => {
      return handleUpdate(
        () => documentSaveService.updateProformaInvoice(data, fileHash),
        "Proforma Invoice"
      );
    },
    [documentSaveService, handleUpdate]
  );

  const updateSwift = useCallback(
    async (data: any, fileHash: string): Promise<SaveResult> => {
      return handleUpdate(
        () => documentSaveService.updateSwift(data, fileHash),
        "Swift"
      );
    },
    [documentSaveService, handleUpdate]
  );

  const updateNumerario = useCallback(
    async (data: any, fileHash: string): Promise<SaveResult> => {
      return handleUpdate(
        () => documentSaveService.updateNumerario(data, fileHash),
        "Numerário"
      );
    },
    [documentSaveService, handleUpdate]
  );

  const updateNotaFiscal = useCallback(
    async (data: any, fileHash: string): Promise<SaveResult> => {
      return handleUpdate(
        () => documentSaveService.updateNotaFiscal(data, fileHash),
        "Nota Fiscal"
      );
    },
    [documentSaveService, handleUpdate]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    saving,
    error,
    lastSaveResult,
    saveDocument,
    saveDI,
    saveCommercialInvoice,
    savePackingList,
    saveProformaInvoice,
    saveSwift,
    saveNumerario,
    saveNotaFiscal,
    updateDI,
    updateCommercialInvoice,
    updatePackingList,
    updateProformaInvoice,
    updateSwift,
    updateNumerario,
    updateNotaFiscal,
    resetDocumentData,
    clearError,
  };
}

/**
 * Hook for auto-save functionality
 */
export function useAutoSave(
  documentType: string,
  getData: () => any,
  options?: {
    enabled?: boolean;
    interval?: number;
    onSave?: (result: SaveResult) => void;
  }
) {
  const { saveDocument } = useDocumentSave();
  const [lastSavedData, setLastSavedData] = useState<string>("");

  useEffect(() => {
    if (!options?.enabled) return;

    const interval = setInterval(async () => {
      const currentData = getData();
      const currentDataString = JSON.stringify(currentData);

      // Only save if data has changed
      if (currentDataString !== lastSavedData) {
        const result = await saveDocument(documentType, currentData, {
          validateBeforeSave: false,
        });

        if (result.success) {
          setLastSavedData(currentDataString);
          options.onSave?.(result);
        }
      }
    }, options.interval || 30000); // Default 30 seconds

    return () => clearInterval(interval);
  }, [documentType, getData, lastSavedData, options, saveDocument]);
}
