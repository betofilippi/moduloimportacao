
'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProformaInvoiceHeader } from '@/services/documents/proforma-invoice/types';

interface ProformaInvoiceHeaderSectionProps {
  header: ProformaInvoiceHeader;
  isEditing: boolean;
  onFieldChange: (field: keyof ProformaInvoiceHeader, value: any) => void;
}

const EditableField = ({ label, value, isEditing, onChange, asTextarea = false }: any) => (
  <div>
    <label className="text-sm font-medium text-gray-500">{label}</label>
    {isEditing ? (
      asTextarea ? (
        <Textarea value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" />
      ) : (
        <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" />
      )
    ) : (
      <p className="mt-1 text-base font-semibold">{value || 'N/A'}</p>
    )}
  </div>
);

export function ProformaInvoiceHeaderSection({ header, isEditing, onFieldChange }: ProformaInvoiceHeaderSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <EditableField
        label="Invoice Number"
        value={header.invoice_number}
        isEditing={isEditing}
        onChange={(value: string) => onFieldChange('invoice_number', value)}
      />
      <EditableField
        label="Contracted Company"
        value={header.contracted_company}
        isEditing={isEditing}
        onChange={(value: string) => onFieldChange('contracted_company', value)}
      />
      <EditableField
        label="Email"
        value={header.contracted_email}
        isEditing={isEditing}
        onChange={(value: string) => onFieldChange('contracted_email', value)}
      />
      <EditableField
        label="Date"
        value={header.date}
        isEditing={isEditing}
        onChange={(value: string) => onFieldChange('date', value)}
      />
      <EditableField
        label="Load Port"
        value={header.load_port}
        isEditing={isEditing}
        onChange={(value: string) => onFieldChange('load_port', value)}
      />
      <EditableField
        label="Destination"
        value={header.destination}
        isEditing={isEditing}
        onChange={(value: string) => onFieldChange('destination', value)}
      />
      <EditableField
        label="Total Price"
        value={header.total_price}
        isEditing={isEditing}
        onChange={(value: string) => onFieldChange('total_price', parseFloat(value) || 0)}
      />
      <EditableField
        label="Payment Terms"
        value={header.payment_terms}
        isEditing={isEditing}
        onChange={(value: string) => onFieldChange('payment_terms', value)}
        asTextarea
      />
      <EditableField
        label="Package"
        value={header.package}
        isEditing={isEditing}
        onChange={(value: string) => onFieldChange('package', value)}
        asTextarea
      />
    </div>
  );
}
