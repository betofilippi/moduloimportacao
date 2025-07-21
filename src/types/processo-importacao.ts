/**
 * Types for Import Process (Processo de Importação)
 */

// Document types available in the system
export type DocumentType = 
  | 'di'
  | 'commercial_invoice'
  | 'packing_list'
  | 'proforma_invoice'
  | 'swift'
  | 'numerario'
  | 'nota_fiscal';

// Status for each document in the process
export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'error' | 'not_applicable';

// Individual document status in the pipeline
export interface DocumentPipelineStatus {
  documentType: DocumentType;
  status: DocumentStatus;
  documentId?: string;
  uploadedAt?: string;
  processedAt?: string;
  error?: string;
  fileHash?: string;
}

// Main process interface
export interface ProcessoImportacao {
  id: string;
  numeroProcesso: string;
  descricao: string;
  empresa: string;
  dataInicio: string;
  dataPrevisaoTermino?: string;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  etapa?: string; // Kanban stage
  responsavel: string;
  observacoes?: string;
  documentsPipeline: DocumentPipelineStatus[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Form field types for dynamic form
export type FieldType = 'text' | 'number' | 'select' | 'date' | 'textarea';

// Dynamic form field configuration
export interface FormFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>; // For select fields
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  defaultValue?: any;
}

// Form configuration for creating/editing process
export interface ProcessoFormConfig {
  fields: FormFieldConfig[];
}

// Default form configuration
export const defaultProcessoFormConfig: ProcessoFormConfig = {
  fields: [
    {
      name: 'numeroProcesso',
      label: 'Número do Processo',
      type: 'text',
      placeholder: 'Ex: IMP-2024-001',
      required: true,
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'textarea',
      placeholder: 'Descrição do processo de importação',
      required: true,
    },
    {
      name: 'empresa',
      label: 'Empresa',
      type: 'text',
      placeholder: 'Nome da empresa importadora',
      required: true,
    },
    {
      name: 'responsavel',
      label: 'Responsável',
      type: 'text',
      placeholder: 'Nome do responsável',
      required: true,
    },
    {
      name: 'dataInicio',
      label: 'Data de Início',
      type: 'date',
      required: true,
    },
    {
      name: 'dataPrevisaoTermino',
      label: 'Previsão de Término',
      type: 'date',
      required: false,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'active', label: 'Ativo' },
        { value: 'on_hold', label: 'Em Espera' },
        { value: 'completed', label: 'Concluído' },
        { value: 'cancelled', label: 'Cancelado' },
      ],
      defaultValue: 'active',
    },
    {
      name: 'observacoes',
      label: 'Observações',
      type: 'textarea',
      placeholder: 'Observações adicionais',
      required: false,
    },
  ],
};

// Document type labels for UI
export const documentTypeLabels: Record<DocumentType, string> = {
  di: 'DI',
  commercial_invoice: 'Commercial Invoice',
  packing_list: 'Packing List',
  proforma_invoice: 'Proforma Invoice',
  swift: 'SWIFT',
  numerario: 'Numerário',
  nota_fiscal: 'Nota Fiscal',
};

// Status colors for UI
export const statusColors: Record<DocumentStatus, string> = {
  pending: 'bg-gray-200 text-gray-700',
  processing: 'bg-blue-200 text-blue-700',
  completed: 'bg-green-200 text-green-700',
  error: 'bg-red-200 text-red-700',
  not_applicable: 'bg-gray-100 text-gray-500',
};

// Status labels for UI
export const statusLabels: Record<DocumentStatus, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  completed: 'Concluído',
  error: 'Erro',
  not_applicable: 'N/A',
};