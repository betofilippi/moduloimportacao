import { ProcessingOptions } from '../base/types';

// Proforma Invoice Header
export interface ProformaInvoiceHeader {
  invoice_number:string;
  contracted_company: string;
  contracted_email: string;
  date: string; // DD/MM/YYYY format
  load_port: string;
  destination: string;
  total_price: number;
  payment_terms: string;
  package: string;
}

// Proforma Invoice Item
export interface ProformaInvoiceItem {
  item_number: number;
  item: string;
  description_in_english: string;
  description_in_chinese: string;
  specifications: string;
  quantity: number;
  unit_price: number;
  package: string;
}

// Complete Proforma Invoice Result
export interface ProformaInvoiceProcessingResult {
  header: ProformaInvoiceHeader;
  items: ProformaInvoiceItem[];
  multiPrompt?: {
    documentType: string;
    totalSteps: number;
    steps: Array<{
      step: number;
      stepName: string;
      result: any;
    }>;
  };
}

// Processing options specific to Proforma Invoice
export interface ProformaInvoiceProcessingOptions extends ProcessingOptions {
  validateDates?: boolean;
  validatePrices?: boolean;
  normalizeChineseText?: boolean;
}

// Validation rules for Proforma Invoice
export interface ProformaInvoiceValidationRules {
  requireHeader: boolean;
  requireItems: boolean;
  validateEmail: boolean;
  validateDateFormat: boolean;
  validatePriceConsistency: boolean;
  validateItemNumbers: boolean;
  minItems?: number;
  maxItems?: number;
}

// Field mapping for data normalization
export interface ProformaInvoiceFieldMapping {
  headerFields: {
    [key: string]: string;
  };
  itemFields: {
    [key: string]: string;
  };
}