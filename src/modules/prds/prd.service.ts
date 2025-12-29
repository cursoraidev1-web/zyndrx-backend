import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database, Json } from '../../types/database.types';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/error.middleware';

// We keep the typed client for reads, but we will bypass it for writes where TS struggles
const db = supabase as SupabaseClient<Database>;

export class PrdService {
  
  // 1. Create PRD
  static async createPRD(data: { project_id: string; title: string; content: Json; created_by: string; company_id?: string }) {
    // If company_id not provided, fetch it from the project
    let companyId = data.company_id;
    if (!companyId) {
      const { data: project, error: projectError } = await (db.from('projects') as any)
        .select('company_id')
        .eq('id', data.project_id)
        .single();

      if (projectError || !project) {
        logger.error('Failed to fetch project for PRD creation', { 
          error: projectError?.message, 
          project_id: data.project_id 
        });
        throw new AppError('Project not found', 404);
      }
      companyId = (project as any).company_id;
    }

    // FORCE CAST to 'any' to bypass the 'never' type error
    const { data: prd, error } = await (db.from('prds') as any)
      .insert({
        ...data,
        company_id: companyId,
        status: 'draft',
        version: 1
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create PRD', { error: error.message, data });
      throw new AppError(`Failed to create PRD: ${error.message}`, 500);
    }
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

    if (error) {
      logger.error('Failed to fetch PRD', { error: error.message, id });
      throw new AppError(`Failed to fetch PRD: ${error.message}`, 500);
    }
    return data;
  }

  // 2b. Get PRDs by Project ID
  static async getPRDsByProject(projectId: string) {
    const { data, error } = await db
      .from('prds')
      .select(`
        *,
        projects ( name ),
        users!prds_created_by_fkey ( full_name )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch PRDs', { error: error.message, projectId });
      throw new AppError(`Failed to fetch PRDs: ${error.message}`, 500);
    }
    return data || [];
  }

  // 2c. Get all PRDs (for listing)
  static async getAllPRDs(companyId: string, userId?: string) {
    try {
      let query = db
        .from('prds')
        .select(`
          *,
          projects ( name ),
          users!prds_created_by_fkey ( full_name )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // If userId provided, filter by creator
      if (userId) {
        query = query.eq('created_by', userId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch PRDs', { error: error.message, companyId, userId });
        throw new AppError(`Failed to fetch PRDs: ${error.message}`, 500);
      }
      return data || [];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get all PRDs error', { error, companyId, userId });
      throw new AppError('Failed to fetch PRDs', 500);
    }
  }

  // 2d. Update PRD content
  static async updatePRD(id: string, updates: { title?: string; content?: Json }) {
    const updatePayload: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data: prd, error } = await (db.from('prds') as any)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update PRD', { error: error.message, id, updates });
      throw new AppError(`Failed to update PRD: ${error.message}`, 500);
    }
    return prd;
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

    if (error) {
      logger.error('Failed to update PRD status', { error: error.message, id, status });
      throw new AppError(`Failed to update PRD status: ${error.message}`, 500);
    }

    if (status === 'approved' && prd) {
      await this.generateTasksFromPRD(prd, approver_id);
    }
    
    return prd;
  }

  // 4. Delete PRD
  static async deletePRD(id: string) {
    const { error } = await (db.from('prds') as any)
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete PRD', { error: error.message, id });
      throw new AppError(`Failed to delete PRD: ${error.message}`, 500);
    }
  }

  // 5. Create PRD Version
  static async createPRDVersion(prdId: string, data: { title: string; content: Json; created_by: string; changes_summary?: string }) {
    // Get current PRD to get version number
    const currentPRD = await this.getPRDById(prdId);
    const newVersion = (currentPRD as any).version + 1;

    // Create version record
    const { data: version, error } = await (db.from('prd_versions') as any)
      .insert({
        prd_id: prdId,
        version: newVersion,
        title: data.title,
        content: data.content,
        created_by: data.created_by,
        changes_summary: data.changes_summary
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create PRD version', { error: error.message, prdId });
      throw new AppError(`Failed to create PRD version: ${error.message}`, 500);
    }

    // Update main PRD with new version
    await (db.from('prds') as any)
      .update({ version: newVersion, updated_at: new Date().toISOString() })
      .eq('id', prdId);

    return version;
  }

  // 6. Get PRD Versions
  static async getPRDVersions(prdId: string) {
    const { data, error } = await db
      .from('prd_versions')
      .select('*')
      .eq('prd_id', prdId)
      .order('version', { ascending: false });

    if (error) {
      logger.error('Failed to fetch PRD versions', { error: error.message, prdId });
      throw new AppError(`Failed to fetch PRD versions: ${error.message}`, 500);
    }
    return data || [];
  }

  // 7. Generate Tasks
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
        logger.error('Failed to auto-generate tasks from PRD', {
          prdId: prd.id,
          error: error.message,
          userId
        });
      } else {
        logger.info('Auto-generated tasks from PRD', {
          prdId: prd.id,
          taskCount: tasksToInsert.length,
          userId
        });
      }
    }
  }
}