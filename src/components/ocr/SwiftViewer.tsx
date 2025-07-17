'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  Building,
  User,
  Hash,
  ArrowRight,
  ArrowRightLeft,
  CreditCard,
  Edit,
  Save,
  X,
  FileCode,
  Banknote,
  Send,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwiftViewerProps {
  data: any;
  onSave?: (data: any) => void;
  onEdit?: (data: any) => void;
  variant?: 'summary' | 'detailed';
  readonly?: boolean;
  className?: string;
}

export function SwiftViewer({
  data,
  onSave,
  onEdit,
  variant = 'detailed',
  readonly = false,
  className
}: SwiftViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(data);

  // Extract Swift data from the data structure
  const swiftData = data?.swiftData || data?.extractedData || data || {};

  const handleEdit = () => {
    setIsEditing(true);
    setEditedData(swiftData);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData(swiftData);
    setIsEditing(false);
  };

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(value || 0);
  };

  const formatBIC = (bic: string) => {
    if (!bic) return 'N/A';
    // Format BIC: AAAA BB CC DDD
    if (bic.length === 11) {
      return `${bic.slice(0, 4)} ${bic.slice(4, 6)} ${bic.slice(6, 8)} ${bic.slice(8)}`;
    } else if (bic.length === 8) {
      return `${bic.slice(0, 4)} ${bic.slice(4, 6)} ${bic.slice(6)}`;
    }
    return bic;
  };

  if (variant === 'summary') {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Swift Summary
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{swiftData.message_type || 'SWIFT'}</Badge>
              <Badge variant="secondary">{swiftData.currency || 'USD'}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Reference</p>
              <p className="font-medium">{swiftData.senders_reference || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Value Date</p>
              <p className="font-medium">{swiftData.value_date || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-medium text-green-600">
                {formatCurrency(swiftData.amount, swiftData.currency)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Invoice</p>
              <p className="font-medium">{swiftData.fatura || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Swift Transaction Details
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{swiftData.message_type || 'SWIFT'}</Badge>
            {!readonly && !isEditing && (
              <Button size="sm" variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {isEditing && (
              <>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transaction References */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Transaction References</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Sender's Reference</p>
                <p className="font-medium">{swiftData.senders_reference || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Transaction Reference</p>
                <p className="font-medium">{swiftData.transaction_reference || 'N/A'}</p>
              </div>
            </div>

            {swiftData.uetr && (
              <div className="flex items-start gap-3 md:col-span-2">
                <FileCode className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">UETR</p>
                  <p className="font-mono text-xs">{swiftData.uetr}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Details */}
        <div className="border-t pt-6">
          <h3 className="font-medium text-lg mb-4">Detalhes da Transação</h3>
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Valor</p>
                  <p className="font-semibold">{swiftData.value_date || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-semibold text-green-600 text-lg">
                    {formatCurrency(swiftData.amount, swiftData.currency)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-lg">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxas</p>
                  <p className="font-semibold">
                    {swiftData.details_of_charges || 'N/A'}
                    {swiftData.details_of_charges && (
                      <span className="text-xs text-muted-foreground ml-1">
                        {swiftData.details_of_charges === 'OUR' && '(Remetente paga)'}
                        {swiftData.details_of_charges === 'SHA' && '(Compartilhado)'}
                        {swiftData.details_of_charges === 'BEN' && '(Beneficiário paga)'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Parties - New Side by Side Layout */}
        <div className="border-t pt-6">
          <h3 className="font-medium text-lg mb-4 text-center">Fluxo da Transação</h3>
          
          <div className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-4 lg:gap-8 items-start">
              {/* Left Side - Beneficiary (Receiver) */}
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-green-900 dark:text-green-100">BENEFICIÁRIO</h4>
                </div>
                
                {/* Beneficiary Details */}
                <div className="space-y-4">
                  <div className="dark:bg-background rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Nome do Beneficiário</p>
                      <p className="font-semibold text-lg">{swiftData.beneficiary?.name || 'N/A'}</p>
                    </div>
                    {swiftData.beneficiary?.account && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Conta</p>
                        <p className="font-mono font-medium">{swiftData.beneficiary.account}</p>
                      </div>
                    )}
                    {swiftData.beneficiary?.address && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Endereço</p>
                        <p className="text-sm">{swiftData.beneficiary.address}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Receiver Institution */}
                  <div className=" dark:bg-background rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="h-4 w-4 text-green-600" />
                      <p className="font-medium text-sm">Instituição Recebedora</p>
                    </div>
                    <div>
                      <p className="font-medium">{swiftData.receiver_institution?.name || 'N/A'}</p>
                      {swiftData.receiver_institution?.bic && (
                        <p className="text-sm font-mono text-muted-foreground mt-1">
                          Código de Identificação Bancária (BIC): {formatBIC(swiftData.receiver_institution.bic)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </div>

              {/* Center Arrow - Hidden on mobile */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="bg-background border-2 border-primary rounded-full p-3">
                  <ArrowRightLeft className="h-8 w-8 text-primary" />
                </div>
              </div>

              {/* Right Side - Sender (Ordering) */}
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-4">
                  <Send className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">ORDENANTE</h4>
                </div>
                
                {/* Ordering Customer Details */}
                <div className="space-y-4">
                  <div className=" dark:bg-background rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Cliente Ordenante</p>
                      <p className="font-semibold text-lg">{swiftData.ordering_customer?.name || 'N/A'}</p>
                    </div>
                    {swiftData.ordering_customer?.address && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Endereço</p>
                        <p className="text-sm">{swiftData.ordering_customer.address}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Ordering Institution */}
                  <div className=" dark:bg-background rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="h-4 w-4 text-blue-600" />
                      <p className="font-medium text-sm">Instituição Ordenante</p>
                    </div>
                    <div>
                      <p className="font-medium">{swiftData.ordering_institution?.name || 'N/A'}</p>
                      {swiftData.ordering_institution?.bic && (
                        <p className="text-sm font-mono text-muted-foreground mt-1">
                          BIC: {formatBIC(swiftData.ordering_institution.bic)}
                        </p>
                      )}
                      {swiftData.ordering_institution?.address && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {swiftData.ordering_institution.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Mobile Arrow - Shown only on mobile */}
          <div className="flex justify-center mt-4 lg:hidden">
            <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium text-lg">Informações Adicionais</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {swiftData.fatura && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-lg">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Número da Invoice/Fatura</p>
                    <p className="font-semibold">{swiftData.fatura}</p>
                  </div>
                </div>
              </div>
            )}

            {swiftData.bank_operation_code && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-lg">
                    <Hash className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Código de Operação</p>
                    <p className="font-semibold">{swiftData.bank_operation_code}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {swiftData.remittance_information && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Informações de Remessa</p>
              <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary">
                <p className="text-sm">{swiftData.remittance_information}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}