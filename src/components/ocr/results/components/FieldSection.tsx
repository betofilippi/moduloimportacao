'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { HeaderField } from './HeaderSection';

interface FieldSectionProps {
  title?: string;
  titleIcon?: React.ReactNode;
  fields: HeaderField[];
  data: Record<string, any>;
  isEditing?: boolean;
  onChange?: (field: string, value: any) => void;
  className?: string;
}

export function FieldSection({
  title,
  titleIcon,
  fields,
  data,
  isEditing = false,
  onChange,
  className
}: FieldSectionProps) {
  const renderField = (field: HeaderField) => {
    // Use accessor if available, otherwise use key directly
    const value = field.accessor ? field.accessor(data) : data[field.key];
    
    if (field.render) {
      return field.render(value, isEditing, (newValue) => onChange?.(field.key, newValue));
    }
    
    if (field.type === 'badge') {
      return <Badge variant="outline">{value || 'N/A'}</Badge>;
    }
    
    if (!isEditing || field.readOnly) {
      const displayValue = field.format ? field.format(value) : (value || 'N/A');
      return <p className="font-medium">{displayValue}</p>;
    }
    
    const commonProps = {
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        onChange?.(field.key, e.target.value),
      className: "mt-1"
    };
    
    switch (field.type) {
      case 'textarea':
        return <Textarea {...commonProps} rows={3} />;
      case 'number':
        return (
          <Input 
            {...commonProps}
            type="number"
            onChange={(e) => onChange?.(field.key, parseFloat(e.target.value) || 0)}
          />
        );
      case 'date':
        return <Input {...commonProps} type="date" />;
      default:
        return <Input {...commonProps} type="text" />;
    }
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h3 className="font-medium text-lg flex items-center gap-2">
          {titleIcon}
          {title}
        </h3>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((field) => (
          <div key={field.key} className={cn(field.gridCols, field.className)}>
            {field.icon && (
              <div className="flex items-start gap-2">
                {field.icon}
                <div className="flex-1 space-y-1">
                  <label className="text-sm text-muted-foreground block">{field.label}</label>
                  <div>{renderField(field)}</div>
                </div>
              </div>
            )}
            {!field.icon && (
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground block">{field.label}</label>
                <div>{renderField(field)}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}