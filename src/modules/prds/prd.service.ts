import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database, Json } from '../../types/database.types';

// We keep the typed client for reads, but we will bypass it for writes where TS struggles
const db = supabase as SupabaseClient<Database>;

export class PrdService {
  
  // 1. Create PRD
  static async createPRD(data: { project_id: string; title: string; content: Json; created_by: string }) {
    // FORCE CAST to 'any' to bypass the 'never' type error
    const { data: prd, error } = await (db.from('prds') as any)
      .insert({
        ...data,
        status: 'draft',
        version: 1
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return prd;
  }

  // 2. Get PRD by ID (Reads usually work fine with types)
  static async getPRDById(id: string) {
    const { data, error } = await db
      .from('prds')
      .select(`
        *,
        projects ( name ),
        users!prds_created_by_fkey ( full_name )
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // 3. Update Status
  static async updateStatus(id: string, status: string, approver_id: string) {
    const updatePayload: any = { status };
    
    if (status === 'approved') {
      updatePayload.approved_by = approver_id;
      updatePayload.approved_at = new Date().toISOString();
    }

    // FORCE CAST to 'any'
    const { data: prd, error } = await (db.from('prds') as any)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (status === 'approved' && prd) {
      await this.generateTasksFromPRD(prd, approver_id);
    }
    
    return prd;
  }

  // 4. Generate Tasks
  private static async generateTasksFromPRD(prd: any, userId: string) {
    const content = prd.content as any;
    const features = content?.features || [];

    if (Array.isArray(features) && features.length > 0) {
      const tasksToInsert = features.map((feature: any) => ({
        project_id: prd.project_id,
        prd_id: prd.id,
        title: feature.name || feature.title || 'Untitled Task',
        description: feature.desc || feature.description || '',
        status: 'todo',
        priority: 'medium',
        created_by: userId
      }));

      // FORCE CAST to 'any'
      const { error } = await (db.from('tasks') as any).insert(tasksToInsert);
      
      if (error) {
        console.error('Failed to auto-generate tasks:', error.message);
      }
    }
  }
}