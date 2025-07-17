import { ProcessingOptions } from '../base/types';

// Swift message data structure
export interface SwiftData {
  message_type: string;
  senders_reference: string;
  transaction_reference: string;
  uetr: string;
  bank_operation_code: string;
  value_date: string; // DD/MM/YYYY format
  currency: string;
  amount: number;
  ordering_customer: {
    name: string;
    address: string;
  };
  ordering_institution: {
    name: string;
    bic: string;
    address: string;
  };
  account_with_institution_bic: string;
  receiver_institution: {
    name: string;
    bic: string;
  };
  beneficiary: {
    account: string;
    name: string;
    address: string;
  };
  remittance_information: string;
  fatura: string;
  details_of_charges: string;
}

// Complete Swift processing result
export interface SwiftProcessingResult {
  swiftData: SwiftData;
  rawText?: string;
  metadata?: {
    documentType: string;
    processingTime?: number;
    confidence?: number;
  };
}

// Processing options specific to Swift
export interface SwiftProcessingOptions extends ProcessingOptions {
  validateBIC?: boolean;
  validateDateFormat?: boolean;
  normalizeText?: boolean;
  extractInvoiceNumber?: boolean;
}

// Validation rules for Swift
export interface SwiftValidationRules {
  requireAllFields: boolean;
  validateBICFormat: boolean;
  validateDateFormat: boolean;
  validateAmount: boolean;
  validateUETR: boolean;
  validateMessageType: boolean;
}

// Swift field tags mapping
export interface SwiftFieldMapping {
  ':20:': 'senders_reference';
  ':21:': 'transaction_reference';
  ':23B:': 'bank_operation_code';
  ':32A:': 'value_date_currency_amount';
  ':50K:': 'ordering_customer';
  ':52D:': 'ordering_institution';
  ':57A:': 'account_with_institution';
  ':59:': 'beneficiary';
  ':70:': 'remittance_information';
  ':71A:': 'details_of_charges';
  ':121:': 'uetr';
}

// Swift message types
export enum SwiftMessageType {
  MT103 = 'FIN 103',
  MT202 = 'FIN 202',
  MT900 = 'FIN 900',
  MT910 = 'FIN 910',
  UNKNOWN = 'UNKNOWN'
}

// Charge types
export enum SwiftChargeType {
  OUR = 'OUR', // Sender pays all charges
  SHA = 'SHA', // Shared charges
  BEN = 'BEN'  // Beneficiary pays all charges
}