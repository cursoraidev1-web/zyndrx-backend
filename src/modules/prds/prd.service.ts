import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database, Json } from '../../types/database.types';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/error.middleware';
import { EmailService } from '../../utils/email.service';

const db = supabaseAdmin as SupabaseClient<Database>;

// Local interfaces to resolve 'never' type errors
interface UserRecord { email: string; full_name: string; }
interface ProjectRecord { name: string; company_id: string; }

export class PrdService {
  
  /**
   * Create a new PRD and notify the creator
   */
  static async createPRD(data: { project_id: string; title: string; content: Json; created_by: string; company_id?: string }) {
    try {
      // 1. Fetch project to ensure it exists and get company context
      const { data: projectFetch, error: projectError } = await db
        .from('projects')
        .select('name, company_id')
        .eq('id', data.project_id)
        .single();

      const project = projectFetch as unknown as ProjectRecord;

      if (projectError || !project) {
        throw new AppError('Project not found', 404);
      }

      const companyId = data.company_id || project.company_id;

      // 2. Insert the PRD
      // We cast the table to any only for the insert operation because Supabase TS generation 
      // can be restrictive with Json fields.
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

      // 3. Send Notification (Async/Fire-and-forget)
      this.sendPRDNotification(prd.id, data.created_by, project.name, prd.title);

      return prd;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create PRD error', { error });
      throw new AppError('Failed to create PRD', 500);
    }
  }

  /**
   * Internal helper for PRD creation emails
   */
  private static async sendPRDNotification(prdId: string, creatorId: string, projectName: string, prdTitle: string) {
    try {
      const { data: creatorFetch } = await db.from('users').select('email, full_name').eq('id', creatorId).single();
      const creator = creatorFetch as unknown as UserRecord;
      
      if (creator?.email) {
        await EmailService.sendPRDCreatedEmail(
          creator.email,
          creator.full_name,
          prdTitle,
          prdId,
          projectName
        );
      }
    } catch (err) {
      logger.warn('Failed to send PRD notification email', err);
    }
  }

  static async getPRDById(id: string, companyId: string) {
    const { data, error } = await db
      .from('prds')
      .select(`
        *,
        projects!inner ( name, company_id ),
        users!prds_created_by_fkey ( full_name )
      `)
      .eq('id', id)
      .eq('projects.company_id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('PRD not found or access denied', 404);
      throw new AppError('Failed to fetch PRD', 500);
    }
    return data;
  }

  static async getPRDsByProject(projectId: string, companyId: string) {
    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('company_id', companyId)
      .single();

    if (!project) throw new AppError('Project not found or access denied', 404);

    const { data, error } = await db
      .from('prds')
      .select(`
        *,
        projects ( name ),
        users!prds_created_by_fkey ( full_name )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError('Failed to fetch PRDs', 500);
    return data || [];
  }

  static async updatePRD(id: string, updates: { title?: string; content?: Json }, companyId: string) {
    // Verify ownership/access
    await this.getPRDById(id, companyId);
    
    const { data: prd, error } = await (db.from('prds') as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw new AppError('Failed to update PRD', 500);
    return prd;
  }

  static async updateStatus(id: string, status: string, approver_id: string) {
    const updatePayload: any = { status };
    if (status === 'approved') {
      updatePayload.approved_by = approver_id;
      updatePayload.approved_at = new Date().toISOString();
    }

    const { data: prd, error } = await (db.from('prds') as any)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(`Failed to update status: ${error.message}`, 500);

    if (status === 'approved' && prd) {
      // Logic for task generation
      this.generateTasksFromPRD(prd, approver_id);
    }
    
    return prd;
  }

  static async deletePRD(id: string, companyId: string) {
    await this.getPRDById(id, companyId);
    const { error } = await db.from('prds').delete().eq('id', id).eq('company_id', companyId);
    if (error) throw new AppError('Failed to delete PRD', 500);
  }

  static async createPRDVersion(prdId: string, companyId: string, data: { title: string; content: Json; created_by: string; changes_summary?: string }) {
    const currentPRD = await this.getPRDById(prdId, companyId);
    const newVersion = ((currentPRD as any).version || 1) + 1;

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

    if (error) throw new AppError('Failed to create PRD version', 500);

    await (db.from('prds') as any).update({ version: newVersion }).eq('id', prdId);
    return version;
  }
  static async getAllPRDs(userId?: string, companyId?: string) {
    let query = db.from('prds').select(`
      *,
      projects ( name ),
      users!prds_created_by_fkey ( full_name )
    `);
  
    if (companyId) query = query.eq('company_id', companyId);
    if (userId) query = query.eq('created_by', userId);
  
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new AppError('Failed to fetch PRDs', 500);
    return data || [];
  }
  
  static async getPRDVersions(prdId: string) {
    const { data, error } = await db
      .from('prd_versions')
      .select('*')
      .eq('prd_id', prdId)
      .order('version', { ascending: false });
  
    if (error) throw new AppError('Failed to fetch PRD versions', 500);
    return data || [];
  }

  private static async generateTasksFromPRD(prd: any, userId: string) {
    const content = prd.content as any;
    const features = content?.features || [];

    if (Array.isArray(features) && features.length > 0) {
      const tasksToInsert = features.map((feature: any) => ({
        project_id: prd.project_id,
        prd_id: prd.id,
        company_id: prd.company_id,
        title: feature.name || feature.title || 'Untitled Task',
        description: feature.desc || feature.description || '',
        status: 'todo',
        priority: 'medium',
        created_by: userId
      }));

      await (db.from('tasks') as any).insert(tasksToInsert);
    }
  }
}