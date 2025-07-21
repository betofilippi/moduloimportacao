import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES, KANBAN_CONFIG } from '@/config/nocodb-tables';

/**
 * Migrate existing stage values to snake_case format
 * This is a one-time migration to fix legacy data
 */
export async function POST(request: NextRequest) {
  console.log('🔄 [MIGRATE-STAGES] Starting stage migration');
  
  try {
    // Check authentication
    const session = await getSecureSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nocodb = getNocoDBService();
    
    // Get all processes
    const response = await nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
      limit: 1000 // Adjust if needed
    });
    
    const processes = response.list || [];
    let migratedCount = 0;
    const errors: any[] = [];
    
    // Process each record
    for (const process of processes) {
      if (process.etapa && KANBAN_CONFIG.STAGE_MAPPINGS[process.etapa as keyof typeof KANBAN_CONFIG.STAGE_MAPPINGS]) {
        try {
          // Map the old value to new value
          const newStage = KANBAN_CONFIG.STAGE_MAPPINGS[process.etapa as keyof typeof KANBAN_CONFIG.STAGE_MAPPINGS];
          
          console.log(`Migrating process ${process.Id}: "${process.etapa}" -> "${newStage}"`);
          
          await nocodb.update(
            NOCODB_TABLES.PROCESSOS_IMPORTACAO,
            process.Id,
            {
              etapa: newStage
            }
          );
          
          migratedCount++;
        } catch (error) {
          console.error(`Error migrating process ${process.Id}:`, error);
          errors.push({
            processId: process.Id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
    
    console.log(`✅ [MIGRATE-STAGES] Migration completed: ${migratedCount} processes migrated`);
    
    return NextResponse.json({
      success: true,
      totalProcesses: processes.length,
      migratedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ [MIGRATE-STAGES] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to migrate stages'
      },
      { status: 500 }
    );
  }
}