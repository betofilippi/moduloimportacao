'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Define ExtractedField interface locally until we find the proper location
export interface ExtractedField {
  name: string;
  label: string;
  value: any;
  confidence?: number;
}
import { CheckCircle, XCircle } from 'lucide-react';

interface ExtractedDataEditorProps {
  fields: ExtractedField[];
  values: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
}

export function ExtractedDataEditor({
  fields,
  values,
  onChange,
}: ExtractedDataEditorProps) {
  const renderField = (field: ExtractedField) => {
    const currentValue = values[field.name] ?? field.value ?? '';
    const isExtracted = field.value !== null;

    return (
      <div key={field.name} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={field.name} className="flex items-center gap-2">
            {field.label}
            {isExtracted ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </Label>
          {field.confidence !== undefined && (
            <span className="text-xs text-muted-foreground">
              {isExtracted ? 'Extraído automaticamente' : 'Não encontrado'}
            </span>
          )}
        </div>
        <Input
          id={field.name}
          type={typeof currentValue === 'number' ? 'number' : 'text'}
          value={currentValue}
          onChange={(e) => {
            const value = e.target.value;
            if (typeof field.value === 'number' && value !== '') {
              onChange(field.name, parseFloat(value));
            } else {
              onChange(field.name, value);
            }
          }}
          placeholder={`Digite ${field.label.toLowerCase()}`}
          className={!isExtracted ? 'border-orange-300' : ''}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map(renderField)}
      </div>
      
      <div className="mt-4 rounded-lg bg-muted p-3">
        <p className="text-sm text-muted-foreground">
          <CheckCircle className="mb-1 mr-1 inline h-4 w-4 text-green-500" />
          Campos extraídos automaticamente
        </p>
        <p className="text-sm text-muted-foreground">
          <XCircle className="mb-1 mr-1 inline h-4 w-4 text-red-500" />
          Campos não encontrados (preencha manualmente)
        </p>
      </div>
    </div>
  );
}