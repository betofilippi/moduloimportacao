'use client';

import React from 'react';
import { DocumentType, DocumentTypeInfo } from '@/services/documents';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface DocumentTypeSelectorProps {
  value: DocumentType | '';
  onChange: (value: DocumentType) => void;
  availableTypes: DocumentTypeInfo[];
  disabled?: boolean;
  showBadges?: boolean;
  className?: string;
}

export function DocumentTypeSelector({
  value,
  onChange,
  availableTypes,
  disabled = false,
  showBadges = true,
  className = ''
}: DocumentTypeSelectorProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="document-type">Tipo de Documento *</Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger 
          id="document-type" 
          className="w-full  border-gray-100 transition-colors"
        >
          <SelectValue placeholder="Selecione o tipo de documento" />
        </SelectTrigger>
        <SelectContent className="bg-black opacity-95">
          {availableTypes.map((type) => (
            <SelectItem key={type.value} value={type.value} className="hover:bg-neutral-950">
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{type.label}</span>
                  {showBadges && (
                    <div className="flex gap-1 ml-2">
                      {type.hasMultiStep && (
                        <Badge variant="secondary" className="text-xs">
                          Multi-Step
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {type.supportedFormats.join(', ').toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {type.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Display selected type info */}
      {value && (
        <div className="text-sm text-muted-foreground">
          {(() => {
            const selectedType = availableTypes.find(t => t.value === value);
            return selectedType ? (
              <div className="flex flex-wrap gap-2 items-center">
                <span>Formatos suportados:</span>
                {selectedType.supportedFormats.map(format => (
                  <Badge key={format} variant="outline" className="text-xs">
                    .{format}
                  </Badge>
                ))}
                {selectedType.hasMultiStep && (
                  <Badge variant="secondary" className="text-xs">
                    Processamento Multi-Etapas
                  </Badge>
                )}
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}