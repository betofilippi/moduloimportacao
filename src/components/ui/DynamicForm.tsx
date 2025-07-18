 'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from './FormField';
import { ProcessoFormConfig } from '@/types/processo-importacao';
import { cn } from '@/lib/utils';

interface DynamicFormProps {
  config: ProcessoFormConfig;
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function DynamicForm({
  config,
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  className,
  disabled = false,
}: DynamicFormProps) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    // Initialize with default values from config and initial values
    const defaults: Record<string, any> = {};
    config.fields.forEach((field) => {
      defaults[field.name] = initialValues[field.name] ?? field.defaultValue ?? '';
    });
    return defaults;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (field: typeof config.fields[0], value: any): string | null => {
    // Required validation
    if (field.required && !value) {
      return `${field.label} é obrigatório`;
    }

    // Type-specific validations
    if (field.validation) {
      if (field.type === 'number') {
        const numValue = Number(value);
        if (field.validation.min !== undefined && numValue < field.validation.min) {
          return `${field.label} deve ser maior ou igual a ${field.validation.min}`;
        }
        if (field.validation.max !== undefined && numValue > field.validation.max) {
          return `${field.label} deve ser menor ou igual a ${field.validation.max}`;
        }
      }

      if (field.type === 'text' && field.validation.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          return field.validation.message || `${field.label} formato inválido`;
        }
      }
    }

    return null;
  };

  const handleChange = (fieldName: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    config.fields.forEach((field) => {
      const error = validateField(field, values[field.name]);
      if (error) {
        newErrors[field.name] = error;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    // Submit form
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {config.fields.map((field) => (
        <FormField
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={(value) => handleChange(field.name, value)}
          error={errors[field.name]}
          disabled={disabled || isSubmitting}
        />
      ))}

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" disabled={disabled || isSubmitting}>
          {isSubmitting ? 'Salvando...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}