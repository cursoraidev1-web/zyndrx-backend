import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';

const db = supabase as SupabaseClient<Database>;

export class ProjectService {
  
  // Create a new Project
  static async createProject(data: { name: string; description?: string; owner_id: string; start_date?: string; end_date?: string }) {
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

  // Get all projects for a specific user (Owner or Member)
  static async getUserProjects(userId: string) {
    // This query fetches projects where the user is the OWNER
    // TODO: Later, expand this to include projects where they are just a 'member'
    const { data, error } = await db
      .from('projects')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  // Get single project details
  static async getProjectById(id: string) {
    const { data, error } = await db
      .from('projects')
      .select('*, users!projects_owner_id_fkey(full_name, email)')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}