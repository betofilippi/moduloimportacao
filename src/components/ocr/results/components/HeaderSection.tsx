'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HeaderField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'badge' | 'custom';
  gridCols?: string; // Tailwind grid class, e.g., "md:col-span-2"
  format?: (value: any) => string;
  render?: (value: any, isEditing: boolean, onChange?: (value: any) => void) => React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  readOnly?: boolean;
}

interface HeaderSectionProps {
  title: string;
  titleIcon?: React.ReactNode;
  fields: HeaderField[];
  data: Record<string, any>;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onChange?: (field: string, value: any) => void;
  badge?: React.ReactNode;
  variant?: 'card' | 'flat';
  className?: string;
}

export function HeaderSection({
  title,
  titleIcon,
  fields,
  data,
  isEditing = false,
  onEdit,
  onSave,
  onCancel,
  onChange,
  badge,
  variant = 'card',
  className
}: HeaderSectionProps) {
  const renderField = (field: HeaderField) => {
    const value = data[field.key];
    
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
  
  const headerContent = (
    <>
      {variant === 'card' && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {titleIcon}
              {title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {badge}
              {!isEditing && onEdit && (
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
              {isEditing && (
                <>
                  <Button size="sm" variant="outline" onClick={onCancel}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={onSave}>
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      
      <div className={variant === 'card' ? 'p-6' : 'space-y-4'}>
        {variant === 'flat' && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-lg flex items-center gap-2">
              {titleIcon}
              {title}
            </h3>
            {badge}
          </div>
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
    </>
  );
  
  if (variant === 'card') {
    return (
      <Card className={cn("w-full", className)}>
        {headerContent}
        <CardContent />
      </Card>
    );
  }
  
  return <div className={cn("space-y-4", className)}>{headerContent}</div>;
}