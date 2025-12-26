import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';
import { SubscriptionService } from '../subscriptions/subscriptions.service';

const db = supabase as SupabaseClient<Database>;

export class ProjectService {
  
  static async createProject(data: any) {
    // Ensure company_id is set
    if (!data.company_id) {
      throw new Error('Company ID is required');
    }

    // Check plan limits
    const limitCheck = await SubscriptionService.checkLimit(data.company_id, 'project');
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message || 'Plan limit reached');
    }

    const { data: project, error } = await (db.from('projects') as any)
      .insert({
        ...data,
        status: 'active',
        company_id: data.company_id // Ensure company_id is set
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return project;
  }

  static async getUserProjects(
    userId: string, 
    companyId: string, 
    filters?: { team_name?: string; status?: string }
  ) {
    // Filter by company_id for multi-tenancy
    let query = db
      .from('projects')
      .select('*')
      .eq('company_id', companyId)
      .or(`owner_id.eq.${userId},id.in.(select project_id from project_members where user_id.eq.${userId})`);

    if (filters?.team_name) {
      query = query.eq('team_name', filters.team_name);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data;
  }

  static async getProjectById(projectId: string, companyId: string) {
    // Filter by company_id for multi-tenancy
    const { data, error } = await db
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('company_id', companyId)
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Project not found or access denied');
    return data;
  }
}