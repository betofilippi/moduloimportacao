import Anthropic from '@anthropic-ai/sdk';
import { DocumentType, PromptStep } from '@/services/documents/base/types';
import { getDocumentPrompt } from './documentPrompts';
import { 
  MultiPromptDocumentType,
  MultiPromptResult,
  FinalMultiPromptResult
} from './multiPromptTypes';
import { documentProcessorFactory } from '@/services/documents';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeOCRResult {
  text: string;
  extractedData: Record<string, unknown>;
  confidence: number;
  totalPages: number;
  language?: string;
  metadata?: {
    model: string;
    processingTime: number;
    tokenUsage?: {
      input: number;
      output: number;
    };
  };
}

/**
 * Extract text and structured data from PDF using Claude API
 * @param pdfBuffer - Buffer containing the PDF file
 * @param documentType - Type of document to process
 * @returns Extracted text and structured data
 */
export async function extractDataFromPDF(
  pdfBuffer: Buffer,
  documentType: DocumentType
): Promise<ClaudeOCRResult> {
  const startTime = Date.now();
  
  try {
    // Convert PDF buffer to base64
    const pdfBase64 = pdfBuffer.toString('base64');
    
    // Get the appropriate prompt for the document type
    const prompt = getDocumentPrompt(documentType);
    
    console.log('prompt', prompt)

    console.log(`Processing PDF with Claude for document type: ${documentType}`);
    
    // Send PDF to Claude API with streaming
    const stream = await anthropic.messages.stream({
      model: 'claude-4-sonnet-20250514',
      max_tokens: 32000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
          ],
        },
      ],
      temperature: 0.1, // Low temperature for more consistent extraction
    });
    
    // Get the complete response after streaming
    const response = await stream.finalMessage();
    
    // Extract the response
    const claudeResponse = response.content[0];
    if (claudeResponse.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    
    // Parse the response to extract structured data
    let extractedData: Record<string, unknown> = {};
    let fullText = '';
    
    try {
      // Remove markdown code block markers if present
      let cleanedResponse = claudeResponse.text.trim();
      
      // Check if the response is wrapped in markdown code blocks
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      // Claude's response should be in JSON format based on our prompt
      const parsedResponse = JSON.parse(cleanedResponse);
      extractedData = parsedResponse.extractedData || {};
      fullText = parsedResponse.fullText || '';
    } catch (parseError) {
      console.error('Error parsing Claude response as JSON:', parseError);
      console.error('Raw response:', claudeResponse.text);
      // Fallback: treat the entire response as text
      fullText = claudeResponse.text;
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      text: fullText,
      extractedData,
      confidence: 0.95, // Claude typically has high confidence
      totalPages: await getPDFPageCount(pdfBuffer),
      language: 'pt-BR', // Assuming Portuguese for Brazilian documents
      metadata: {
        model: 'claude-4-sonnet-20250514',
        processingTime,
        tokenUsage: {
          input: response.usage?.input_tokens || 0,
          output: response.usage?.output_tokens || 0,
        },
      },
    };
  } catch (error) {
    console.error('Error processing PDF with Claude:', error);
    throw new Error(`Failed to process PDF with Claude: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the page count of a PDF
 * @param pdfBuffer - Buffer containing the PDF file
 * @returns Number of pages in the PDF
 */
async function getPDFPageCount(pdfBuffer: Buffer): Promise<number> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    return 1; // Default to 1 if we can't determine page count
  }
}

/**
 * Validate extracted data based on document type requirements
 * @param extractedData - Data extracted from the document
 * @param documentType - Type of document
 * @returns Validation result with missing fields
 */
export function validateExtractedData(
  extractedData: Record<string, unknown>,
  documentType: DocumentType
): { isValid: boolean; missingFields: string[] } {
  const requiredFields = getRequiredFields(documentType);
  const missingFields = requiredFields.filter(field => !extractedData[field]);
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Get document prompts for multi-step processing
 * @param documentType - Type of document
 * @returns Array of prompt steps
 */
function getDocumentPrompts(documentType: MultiPromptDocumentType): PromptStep[] {
  try {
    // Mapeamento direto dos tipos sem conversão de case
    const typeMap: Record<MultiPromptDocumentType, DocumentType> = {
      'packing_list': DocumentType.PACKING_LIST,
      'commercial_invoice': DocumentType.COMMERCIAL_INVOICE,
      'proforma_invoice': DocumentType.PROFORMA_INVOICE,
      'swift': DocumentType.SWIFT,
      'di': DocumentType.DI,
      'numerario': DocumentType.NUMERARIO,
      'nota_fiscal': DocumentType.NOTA_FISCAL
    };
    
    const docType = typeMap[documentType];
    if (!docType) {
      throw new Error(`Tipo de documento não mapeado: ${documentType}`);
    }
    
    const processor = documentProcessorFactory.getProcessor(docType);
    return processor.getSteps();
  } catch (error) {
    console.error(`Error getting prompts for document type ${documentType}:`, error);
    // Fallback melhorado com mensagem mais específica
    return [{
      step: 1,
      name: 'Processar Documento',
      description: `Processar documento do tipo ${documentType}`,
      prompt: `Processe este documento do tipo ${documentType} e extraia todas as informações relevantes em formato JSON estruturado.`
    }];
  }
}

/**
 * Get total steps for a document type
 * @param documentType - Type of document
 * @returns Number of processing steps
 */
function getDocumentTotalSteps(documentType: MultiPromptDocumentType): number {
  const prompts = getDocumentPrompts(documentType);
  return prompts.length;
}

/**
 * Get required fields for a document type
 * @param documentType - Type of document
 * @returns Array of required field names
 */
function getRequiredFields(documentType: DocumentType): string[] {
  const requiredFieldsMap: Record<DocumentType, string[]> = {
    commercial_invoice: ['invoiceNumber', 'invoiceDate', 'totalAmount', 'supplierName'],
    packing_list: ['containerNumber', 'totalWeight', 'items'],
    di: ['diNumber', 'registrationDate', 'customsValue'],
    swift: ['swiftCode', 'transactionReference', 'amount', 'currency'],
    numerario: ['documentNumber', 'date', 'totalAmount', 'description'],
    nota_fiscal: ['nfNumber', 'issueDate', 'totalValue', 'issuerCNPJ'],
    ci: ['ciNumber', 'issueDate', 'description'],
    afrmm: ['afrmmNumber', 'issueDate', 'amount', 'dueDate'],
    proforma_invoice: ['proformaNumber', 'issueDate', 'totalAmount', 'supplierName'],
  };
  
  return requiredFieldsMap[documentType] || [];
}

/**
 * Extract data from PDF using multiple sequential prompts
 * @param pdfBuffer - Buffer containing the PDF file
 * @param documentType - Type of document to process with multiple prompts
 * @param onProgress - Callback function to track progress
 * @returns Final result with all steps processed
 */
export async function extractDataWithMultiplePrompts(
  pdfBuffer: Buffer,
  documentType: MultiPromptDocumentType,
  onProgress?: (step: number, totalSteps: number, stepName: string, stepDescription: string) => void
): Promise<FinalMultiPromptResult> {
  const startTime = Date.now();
  const prompts = getDocumentPrompts(documentType);
  const totalSteps = prompts.length;
  const stepResults: MultiPromptResult[] = [];
  
  let previousResult = '';
  let totalTokenInput = 0;
  let totalTokenOutput = 0;

  try {
    // Convert PDF buffer to base64 once
    const pdfBase64 = pdfBuffer.toString('base64');
    
    console.log(`Processing PDF with ${totalSteps} prompts for document type: ${documentType}`);

    // Process each prompt sequentially
    for (let i = 0; i < prompts.length; i++) {
      const promptStep = prompts[i];
      const stepStartTime = Date.now();
      
      // Call progress callback
      if (onProgress) {
        onProgress(promptStep.step, totalSteps, promptStep.name, promptStep.description);
      }

      console.log(`Processing step ${promptStep.step}/${totalSteps}: ${promptStep.name}`);

      // Get prompt with previous result if needed
      let currentPrompt = promptStep.prompt;
      if (promptStep.expectsInput && previousResult) {
        currentPrompt += `\n\nInformação do módulo anterior: ${previousResult}`;
      }

      // Send to Claude API
      const stream = await anthropic.messages.stream({
        model: 'claude-4-sonnet-20250514',
        max_tokens: 32000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: currentPrompt,
              },
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdfBase64,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
      });

      // Get the complete response after streaming
      const response = await stream.finalMessage();
      
      // Extract the response
      const claudeResponse = response.content[0];
      if (claudeResponse.type !== 'text') {
        throw new Error(`Unexpected response type from Claude at step ${promptStep.step}`);
      }

      // Clean the response
      let cleanedResponse = claudeResponse.text.trim();
      
      // Remove markdown code block markers if present
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }

      const stepProcessingTime = Date.now() - stepStartTime;
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      
      totalTokenInput += inputTokens;
      totalTokenOutput += outputTokens;

      // Store step result
      const stepResult: MultiPromptResult = {
        step: promptStep.step,
        stepName: promptStep.name,
        stepDescription: promptStep.description,
        result: cleanedResponse,
        metadata: {
          tokenUsage: {
            input: inputTokens,
            output: outputTokens,
          },
          processingTime: stepProcessingTime,
        },
      };

      stepResults.push(stepResult);

      // Set previous result for next step
      previousResult = cleanedResponse;

      console.log(`Completed step ${promptStep.step}/${totalSteps}: ${promptStep.name} (${stepProcessingTime}ms)`);
      console.log(`🔍 RESULTADO DA ETAPA ${promptStep.step} - ${promptStep.name}:`);
      console.log(cleanedResponse);
      console.log(`📊 Tokens: ${inputTokens} input, ${outputTokens} output`);
      console.log(`📏 Tamanho da resposta: ${cleanedResponse.length} caracteres`);
      console.log('═'.repeat(80));
    }

    // Parse and structure results from each step
    let structuredResult: any = {
      header: null,
      containers: null,
      disposition_explanation: null,
      items: null,
      processing_summary: {
        totalSteps,
        totalProcessingTime: 0, // Will be calculated below
        stepsCompleted: stepResults.map(s => s.step)
      }
    };
    
    let extractedData: any = {};
    let rawText = '';
    
    // Process each step result
    for (const stepResult of stepResults) {
      try {
        const cleanResult = stepResult.result.trim();
        
        // Special handling for Swift (single step)
        if (documentType === 'swift' && stepResult.step === 1) {
          if (cleanResult.startsWith('{') && cleanResult.endsWith('}')) {
            const swiftData = JSON.parse(cleanResult);
            extractedData = swiftData;
            structuredResult.header = {
              data: swiftData,
              source: 'step_1',
              metadata: {
                step: stepResult.step,
                stepName: stepResult.stepName,
                stepDescription: stepResult.stepDescription,
                processingTime: stepResult.metadata?.processingTime || 0
              }
            };
          }
          break;
        }
        
        // Special handling for DI (3 steps: header, items, tax info)
        if (documentType === 'di') {
          switch (stepResult.step) {
            case 1:
              // DI header data
              if (cleanResult.startsWith('{') && cleanResult.endsWith('}')) {
                structuredResult.header = {
                  data: JSON.parse(cleanResult),
                  source: 'step_1',
                  metadata: {
                    step: stepResult.step,
                    stepName: stepResult.stepName,
                    stepDescription: stepResult.stepDescription,
                    processingTime: stepResult.metadata?.processingTime || 0
                  }
                };
              }
              break;
            case 2:
              // DI items array
              if (cleanResult.startsWith('[') && cleanResult.endsWith(']')) {
                const items = JSON.parse(cleanResult);
                structuredResult.items = {
                  data: items,
                  source: 'step_2',
                  metadata: {
                    step: stepResult.step,
                    stepName: stepResult.stepName,
                    stepDescription: stepResult.stepDescription,
                    processingTime: stepResult.metadata?.processingTime || 0
                  }
                };
                // Also set as extractedData for backward compatibility
                extractedData = items;
              }
              break;
            case 3:
              // DI tax info array
              if (cleanResult.startsWith('[') && cleanResult.endsWith(']')) {
                structuredResult.taxInfo = {
                  data: JSON.parse(cleanResult),
                  source: 'step_3',
                  metadata: {
                    step: stepResult.step,
                    stepName: stepResult.stepName,
                    stepDescription: stepResult.stepDescription,
                    processingTime: stepResult.metadata?.processingTime || 0
                  }
                };
              }
              break;
          }
          continue; // Continue processing all DI steps
        }
        
        // Special handling for Numerário (3 steps: DI number, header, items)
        if (documentType === 'numerario') {
          switch (stepResult.step) {
            case 1:
              // DI number extraction
              if (cleanResult.startsWith('{') && cleanResult.endsWith('}')) {
                structuredResult.diInfo = {
                  data: JSON.parse(cleanResult),
                  source: 'step_1',
                  metadata: {
                    step: stepResult.step,
                    stepName: stepResult.stepName,
                    stepDescription: stepResult.stepDescription,
                    processingTime: stepResult.metadata?.processingTime || 0
                  }
                };
              }
              break;
            case 2:
              // NF-e header data
              if (cleanResult.startsWith('{') && cleanResult.endsWith('}')) {
                structuredResult.header = {
                  data: JSON.parse(cleanResult),
                  source: 'step_2',
                  metadata: {
                    step: stepResult.step,
                    stepName: stepResult.stepName,
                    stepDescription: stepResult.stepDescription,
                    processingTime: stepResult.metadata?.processingTime || 0
                  }
                };
              }
              break;
            case 3:
              // NF-e items array
              if (cleanResult.startsWith('[') && cleanResult.endsWith(']')) {
                const items = JSON.parse(cleanResult);
                structuredResult.items = {
                  data: items,
                  source: 'step_3',
                  metadata: {
                    step: stepResult.step,
                    stepName: stepResult.stepName,
                    stepDescription: stepResult.stepDescription,
                    processingTime: stepResult.metadata?.processingTime || 0
                  }
                };
                // Also set as extractedData for backward compatibility
                extractedData = items;
              }
              break;
          }
          continue; // Continue processing all Numerário steps
        }
        
        // Special handling for Nota Fiscal (2 steps: header, items)
        if (documentType === 'nota_fiscal') {
          switch (stepResult.step) {
            case 1:
              // NF-e header data
              if (cleanResult.startsWith('{') && cleanResult.endsWith('}')) {
                structuredResult.header = {
                  data: JSON.parse(cleanResult),
                  source: 'step_1',
                  metadata: {
                    step: stepResult.step,
                    stepName: stepResult.stepName,
                    stepDescription: stepResult.stepDescription
                  }
                };
                console.log(`✅ Nota Fiscal - Step 1: Extracted header with ${Object.keys(JSON.parse(cleanResult)).length} fields`);
              }
              break;
            case 2:
              // NF-e items array
              if (cleanResult.startsWith('[') && cleanResult.endsWith(']')) {
                const items = JSON.parse(cleanResult);
                structuredResult.items = {
                  data: items,
                  source: 'step_2',
                  metadata: {
                    step: stepResult.step,
                    stepName: stepResult.stepName,
                    stepDescription: stepResult.stepDescription,
                    itemCount: items.length
                  }
                };
                console.log(`✅ Nota Fiscal - Step 2: Extracted ${items.length} items`);
              }
              break;
          }
          continue; // Skip general processing for nota_fiscal
        }
        
        switch (stepResult.step) {
          case 1:
            // Header/General data - should be JSON object
            if (cleanResult.startsWith('{') && cleanResult.endsWith('}')) {
              structuredResult.header = {
                data: JSON.parse(cleanResult),
                source: 'step_1',
                metadata: {
                  step: stepResult.step,
                  stepName: stepResult.stepName,
                  stepDescription: stepResult.stepDescription,
                  processingTime: stepResult.metadata?.processingTime || 0
                }
              };
            }
            break;
            
          case 2:
            // For commercial_invoice and proforma_invoice, step 2 is items, not containers
            console.log(`Processing step 2 for ${documentType}, result length: ${cleanResult.length}`);
            if (cleanResult.startsWith('[') && cleanResult.endsWith(']')) {
              const parsedData = JSON.parse(cleanResult);
              const fieldName = (documentType === 'commercial_invoice' || documentType === 'proforma_invoice') ? 'items' : 'containers';
              
              console.log(`Step 2: Using field name '${fieldName}' for ${documentType}`);
              console.log(`Step 2: Parsed ${parsedData.length} items`);
              
              structuredResult[fieldName] = {
                data: parsedData,
                source: 'step_2',
                metadata: {
                  step: stepResult.step,
                  stepName: stepResult.stepName,
                  stepDescription: stepResult.stepDescription,
                  processingTime: stepResult.metadata?.processingTime || 0
                }
              };
              
              // For commercial_invoice, also set extractedData
              if (documentType === 'commercial_invoice') {
                extractedData = parsedData;
                console.log(`Step 2: Set extractedData for commercial_invoice with ${parsedData.length} items`);
              }
            } else {
              console.warn(`Step 2: Result does not appear to be a JSON array for ${documentType}`);
            }
            break;
            
          case 3:
            // Disposition explanation - text
            structuredResult.disposition_explanation = {
              data: cleanResult,
              source: 'step_3',
              metadata: {
                step: stepResult.step,
                stepName: stepResult.stepName,
                stepDescription: stepResult.stepDescription,
                processingTime: stepResult.metadata?.processingTime || 0
              }
            };
            break;
            
          case 4:
            // Final items - should be JSON array
            if (cleanResult.startsWith('[') && cleanResult.endsWith(']')) {
              structuredResult.items = {
                data: JSON.parse(cleanResult),
                source: 'step_4',
                metadata: {
                  step: stepResult.step,
                  stepName: stepResult.stepName,
                  stepDescription: stepResult.stepDescription,
                  processingTime: stepResult.metadata?.processingTime || 0
                }
              };
              
              // Also set as extractedData for backward compatibility
              extractedData = JSON.parse(cleanResult);
            } else {
              rawText = cleanResult;
            }
            break;
            
          default:
            console.warn(`Unknown step: ${stepResult.step}`);
        }
      } catch (parseError) {
        console.error(`Error parsing step ${stepResult.step} result:`, parseError);
        console.error('Step result:', stepResult.result);
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    structuredResult.processing_summary.totalProcessingTime = totalProcessingTime;

    const finalResult: FinalMultiPromptResult = {
      success: true,
      documentType,
      totalSteps,
      steps: stepResults,
      finalResult: {
        rawText: rawText || JSON.stringify(extractedData, null, 2),
        extractedData,
        structuredResult, // Add the new structured result
      },
      metadata: {
        totalProcessingTime,
        totalTokenUsage: {
          input: totalTokenInput,
          output: totalTokenOutput,
        },
      },
    };

    console.log(`Completed all ${totalSteps} steps for ${documentType} in ${totalProcessingTime}ms`);
    
    return finalResult;

  } catch (error) {
    console.error('Error processing PDF with multiple prompts:', error);
    throw new Error(`Failed to process PDF with multiple prompts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}