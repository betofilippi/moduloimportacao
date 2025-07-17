// Commercial Invoice specific types

export interface CommercialInvoiceItem {
  lineNumber?: number;
  description?: string;
  descriptionChinese?: string; // Added for Chinese name
  reference?: string; // Added for reference code
  hsCode?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  weight?: number;
  origin?: string;
}

export interface CommercialInvoiceHeader {
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
  currency?: string;
  supplierName?: string;
  supplierAddress?: string;
  supplierTaxId?: string;
  buyerName?: string;
  buyerAddress?: string;
  buyerTaxId?: string;
  paymentTerms?: string;
  incoterm?: string;
  incotermPlace?: string;
  shippingMarks?: string;
  packingDetails?: string;
  totalWeight?: number;
  totalVolume?: number;
  numberOfPackages?: number;
  vesselName?: string;
  voyageNumber?: string;
  billOfLadingNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  countryOfOrigin?: string;
  countryOfDestination?: string;
  // Additional fields from multi-prompt
  notifyPartyName?: string;
  notifyPartyCNPJ?: string;
  notifyPartyAddress?: string;
  totalAmountWords?: string;
}

export interface CommercialInvoiceProcessingResult {
  header?: CommercialInvoiceHeader;
  items?: CommercialInvoiceItem[];
  // Additional fields for compatibility
  extractedData?: any;
  fullText?: string;
  // Multi-prompt metadata
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

export interface CommercialInvoiceValidationRules {
  requireHeader: boolean;
  requireItems: boolean;
  validateInvoiceNumber: boolean;
  validateSupplierInfo: boolean;
  validateBuyerInfo: boolean;
  validateAmountConsistency: boolean;
  validateItemTotals: boolean;
  validateCurrency: boolean;
  validateHSCodes: boolean;
  validateDates: boolean;
}

export interface CommercialInvoiceProcessingOptions {
  validateData?: boolean;
  saveToStorage?: boolean;
  extractItemDetails?: boolean;
  validateTaxIds?: boolean;
  checkAmountConsistency?: boolean;
  useMultiStep?: boolean; // Control single vs multi-step processing
}

// Summary data for display
export interface CommercialInvoiceSummary {
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  supplierName: string;
  buyerName: string;
  itemCount: number;
  totalWeight?: number;
  invoiceDate?: string;
}