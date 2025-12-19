import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';

const db = supabase as SupabaseClient<Database>;

export class ProjectService {
  
  // FIX: Explicitly type 'data' as 'any' so it accepts 'team_name' without complaining
  static async createProject(data: any) {
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

  // Fetch with Filters (Team, Status)
  static async getUserProjects(userId: string, filters?: { team_name?: string; status?: string }) {
    let query = db.from('projects').select('*').eq('owner_id', userId);

    // Apply UI Filters
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