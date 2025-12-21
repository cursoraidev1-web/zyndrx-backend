import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';
import { PRICING_LIMITS, PlanType } from '../../config/pricing';

const db = supabase as SupabaseClient<Database>;

export class ProjectService {
  
  // FIX: Cast 'data' to 'any' to access 'plan'
  private static async getUserPlan(userId: string): Promise<PlanType> {
    const { data } = await db.from('users').select('plan').eq('id', userId).single();
    return ((data as any)?.plan as PlanType) || 'free';
  }

  static async createProject(data: any) {
    const plan = await this.getUserPlan(data.owner_id);
    const limits = PRICING_LIMITS[plan];

    const { count } = await db
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', data.owner_id);

    const currentCount = count || 0;

    if (currentCount >= limits.maxProjects) {
      throw new Error(`Plan limit reached. Your ${plan} plan only allows ${limits.maxProjects} project(s). Upgrade to create more.`);
    }

    const { data: project, error } = await (db.from('projects') as any)
      .insert({
        ...data,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return project;
  }

  static async getUserProjects(userId: string, filters?: { team_name?: string; status?: string }) {
    let query = db.from('projects').select('*').eq('owner_id', userId);

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

  static async getProjectById(projectId: string) {
    const { data, error } = await db
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}