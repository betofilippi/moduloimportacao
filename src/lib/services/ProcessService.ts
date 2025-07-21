import { getNocoDBService } from './nocodb';
import { NOCODB_TABLES, TABLE_FIELD_MAPPINGS } from '@/config/nocodb-tables';

export interface ProcessUpdateData {
  porto_embarque?: string;
  porto_destino?: string;
  condicoes_pagamento?: string;
  empresa?: string;
  email_responsavel?: string;
  valor_total_estimado?: number;
  moeda?: string;
  proforma_invoice_doc_id?: string;
  [key: string]: any;
}

class ProcessService {
  private static instance: ProcessService;
  private nocodb = getNocoDBService();

  private constructor() {}

  static getInstance(): ProcessService {
    if (!ProcessService.instance) {
      ProcessService.instance = new ProcessService();
    }
    return ProcessService.instance;
  }

  /**
   * Update process with proforma invoice details
   */
  async updateProcessWithProformaDetails(
    processId: string,
    proformaData: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find process by numero_processo
      const processes = await this.nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
        where: `(numero_processo,eq,${processId})`,
        limit: 1
      });

      if (!processes.list || processes.list.length === 0) {
        return { success: false, error: 'Processo não encontrado' };
      }

      const process = processes.list[0];
      
      // Extract proforma header data
      const header = proformaData.header || proformaData;
      
      // Prepare update data with proforma details
      const updateData: ProcessUpdateData = {};
      
      // Map proforma fields to process fields
      if (header.load_port) updateData.porto_embarque = header.load_port;
      if (header.destination) updateData.porto_destino = header.destination;
      if (header.payment_terms) updateData.condicoes_pagamento = header.payment_terms;
      if (header.contracted_company) updateData.empresa = header.contracted_company;
      if (header.contracted_email) updateData.email_responsavel = header.contracted_email;
      if (header.total_price) updateData.valor_total_estimado = header.total_price;
      if (header.currency) updateData.moeda = header.currency;
      
      // Update process
      await this.nocodb.update(NOCODB_TABLES.PROCESSOS_IMPORTACAO, process.Id, updateData);
      
      console.log(`Process ${processId} updated with proforma details`);
      return { success: true };
    } catch (error) {
      console.error('Error updating process with proforma details:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get process by ID
   */
  async getProcess(processId: string): Promise<any | null> {
    try {
      const processes = await this.nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
        where: `(numero_processo,eq,${processId})`,
        limit: 1
      });

      if (processes.list && processes.list.length > 0) {
        return processes.list[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error getting process:', error);
      return null;
    }
  }

  /**
   * Update process status
   */
  async updateProcessStatus(
    processId: string,
    status: 'active' | 'completed' | 'cancelled'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const processes = await this.nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
        where: `(numero_processo,eq,${processId})`,
        limit: 1
      });

      if (!processes.list || processes.list.length === 0) {
        return { success: false, error: 'Processo não encontrado' };
      }

      const process = processes.list[0];
      const updateData: any = { status };
      
      if (status === 'completed') {
        updateData.data_conclusao = new Date().toISOString().split('T')[0];
      }
      
      await this.nocodb.update(NOCODB_TABLES.PROCESSOS_IMPORTACAO, process.Id, updateData);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating process status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create a new process
   */
  async createProcess(processData: any): Promise<{ success: boolean; processId?: string; error?: string }> {
    try {
      console.log('Creating process with data:', processData);
      
      // Transform data to NocoDB format
      const transformedData = this.transformToNocoDBFormat(processData);
      
      console.log('Transformed data for NocoDB:', transformedData);
      
      // Create process
      const created = await this.nocodb.create(NOCODB_TABLES.PROCESSOS_IMPORTACAO, transformedData);
      
      console.log('Process created:', created);
      
      return { 
        success: true, 
        processId: created.numero_processo || created.Id 
      };
    } catch (error) {
      console.error('Error creating process:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Transform data to NocoDB format
   */
  private transformToNocoDBFormat(data: any): any {
    const transformed: any = {};
    const mapping = TABLE_FIELD_MAPPINGS.PROCESSOS_IMPORTACAO;
    
    for (const [field, dbField] of Object.entries(mapping)) {
      if (data.hasOwnProperty(field)) {
        transformed[dbField] = data[field];
      }
    }
    
    // Handle special fields
    if (data.documentsPipeline && typeof data.documentsPipeline !== 'string') {
      transformed.documentsPipeline = JSON.stringify(data.documentsPipeline);
    }
    
    return transformed;
  }
}

export function getProcessService(): ProcessService {
  return ProcessService.getInstance();
}