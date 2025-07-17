'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentUploadForm } from './DocumentUploadForm';
import { DocumentType, getAllDocumentTypeInfos } from '@/services/documents';
import { FileText, Settings, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export function DocumentProcessorDemo() {
  const [processingResults, setProcessingResults] = useState<any>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | null>(null);

  const allTypes = getAllDocumentTypeInfos();

  const handleProcessComplete = (results: any, documentType: DocumentType) => {
    setProcessingResults(results);
    setSelectedDocumentType(documentType);
  };

  const renderResults = () => {
    if (!processingResults) return null;

    const { success, data, error, metadata } = processingResults;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
            Resultado do Processamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  Tipo: {allTypes.find(t => t.value === selectedDocumentType)?.label}
                </Badge>
                {metadata?.totalSteps && (
                  <Badge variant="secondary">
                    {metadata.totalSteps} etapas processadas
                  </Badge>
                )}
                <Badge variant="outline">
                  Processado com sucesso
                </Badge>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Dados Extraídos:</h4>
                <pre className="text-sm overflow-auto max-h-96">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>

              {data?.multiPrompt && (
                <div className="space-y-2">
                  <h4 className="font-medium">Etapas de Processamento:</h4>
                  {data.multiPrompt.steps?.map((step: any, index: number) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{step.step}</Badge>
                        <span className="font-medium">{step.stepName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Resultado processado com sucesso
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-600">
              <p className="font-medium">Erro no processamento:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Sistema Modular de Processamento de Documentos</h1>
        <p className="text-muted-foreground">
          Demonstração do novo sistema modular com Factory Pattern e processadores específicos por tipo de documento
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload & Processamento</TabsTrigger>
          <TabsTrigger value="types">Tipos Suportados</TabsTrigger>
          <TabsTrigger value="info">Informações do Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <DocumentUploadForm
            onProcessComplete={handleProcessComplete}
            className="max-w-2xl mx-auto"
          />
          
          {renderResults()}
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allTypes.map((type) => (
              <Card key={type.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {type.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {type.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {type.hasMultiStep && (
                      <Badge variant="secondary">Multi-Step</Badge>
                    )}
                    <Badge variant="outline">
                      {type.supportedFormats.length} formato(s)
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Formatos suportados:</p>
                    <div className="flex flex-wrap gap-1">
                      {type.supportedFormats.map(format => (
                        <Badge key={format} variant="outline" className="text-xs">
                          .{format}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Arquitetura do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Padrão de Arquitetura:</span>
                    <span className="font-medium">Factory Pattern</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processadores Registrados:</span>
                    <span className="font-medium">{allTypes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipos Multi-Step:</span>
                    <span className="font-medium">
                      {allTypes.filter(t => t.hasMultiStep).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Formatos Suportados:</span>
                    <span className="font-medium">
                      {Array.from(new Set(allTypes.flatMap(t => t.supportedFormats))).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Recursos Implementados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Processamento modular por tipo de documento
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Factory Pattern para descoberta automática
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Validação específica por tipo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    APIs dinâmicas baseadas em tipo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Prompts organizados por módulo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Componentes específicos por tipo
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Como Adicionar Novos Tipos de Documento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <p className="font-medium">Passos para adicionar um novo tipo:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Criar pasta em <code>src/services/documents/novo-tipo/</code></li>
                  <li>Implementar <code>types.ts</code>, <code>prompts.ts</code>, <code>Processor.ts</code> e <code>Validator.ts</code></li>
                  <li>Registrar o processador no <code>index.ts</code></li>
                  <li>Criar componentes específicos em <code>src/components/documents/novo-tipo/</code></li>
                  <li>As APIs funcionarão automaticamente via Factory Pattern</li>
                </ol>
                <p className="text-muted-foreground mt-3">
                  O sistema é completamente modular e extensível. Cada tipo de documento é independente e pode ter seus próprios prompts, validações e componentes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}