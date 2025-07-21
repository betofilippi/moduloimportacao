import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

/**
 * Update import process with data from Proforma Invoice
 * Simple and direct - just update the fields we need
 */
export async function POST(request: NextRequest) {
  console.log('📋 [UPDATE-FROM-PROFORMA] Starting process update with Proforma data');
  
  try {
    // Check authentication
    const session = await getSecureSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { processId, proformaData } = await request.json();

    // Validate inputs
    if (!processId || !proformaData) {
      return NextResponse.json(
        { error: 'Missing required fields: processId, proformaData' },
        { status: 400 }
      );
    }

    // Extract Proforma header data (handle different structures)
    const headerData = proformaData.header?.data || proformaData.header || {};
    
    // Prepare simple update data
    const updateData: Record<string, any> = {};
    
    // Update invoice number if available
    if (headerData.invoice_number) {
      updateData.invoiceNumber = headerData.invoice_number;
    }
    
    // Update company information
    if (headerData.contracted_company) {
      updateData.empresa = headerData.contracted_company;
    }
    
    // Update total value
    if (headerData.total_price) {
      updateData.valor_total_estimado = headerData.total_price;
      updateData.moeda = 'USD'; // Proforma usually in USD
    }
    
    // Update timestamp
    updateData.atualizado_em = new Date().toISOString();
    updateData.atualizado_por = session.user.email || session.user.id;

    console.log('🔄 [UPDATE-FROM-PROFORMA] Updating process:', processId, 'with:', updateData);

    // Update the process
    const nocodb = getNocoDBService();
    const updated = await nocodb.update(
      NOCODB_TABLES.PROCESSOS_IMPORTACAO,
      processId,
      updateData
    );

    console.log('✅ [UPDATE-FROM-PROFORMA] Process updated successfully');

    return NextResponse.json({
      success: true,
      processId,
      updatedFields: Object.keys(updateData)
    });

  } catch (error) {
    console.error('❌ [UPDATE-FROM-PROFORMA] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update process'
      },
      { status: 500 }
    );
  }
}