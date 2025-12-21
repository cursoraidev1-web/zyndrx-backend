import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';
import { PRICING_LIMITS, PlanType } from '../../config/pricing';

const db = supabase as SupabaseClient<Database>;

export class TaskService {
  
  static async getTasksByProject(projectId: string) {
    const { data, error } = await db
      .from('tasks')
      .select(`
        *,
        assignee:users!tasks_assigned_to_fkey(id, full_name, avatar_url),
        reporter:users!tasks_created_by_fkey(full_name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }

  static async createTask(data: any, userId: string) {
    const { data: project } = await db.from('projects').select('owner_id').eq('id', data.project_id).single();
    if (!project) throw new Error('Project not found');

    // FIX: Cast 'project' to 'any' to access 'owner_id'
    const ownerId = (project as any).owner_id;

    const { data: userData } = await db.from('users').select('plan').eq('id', ownerId).single();
    
    // FIX: Cast 'userData' to 'any' to access 'plan'
    const plan = ((userData as any)?.plan as PlanType) || 'free';
    const limits = PRICING_LIMITS[plan];

    const { count } = await db
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', data.project_id);

    const currentCount = count || 0;

    if (currentCount >= limits.maxTasks) {
       throw new Error(`Task limit reached for this project. The owner's ${plan} plan allows ${limits.maxTasks} tasks.`);
    }

    const { data: task, error } = await (db.from('tasks') as any)
      .insert({
        ...data,
        created_by: userId,
        status: 'todo'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return task;
  }

  static async updateTask(taskId: string, updates: any) {
    const { data: task, error } = await (db.from('tasks') as any)
      .update(updates)
      .eq('id', taskId)
      .select(`
        *,
        assignee:users!tasks_assigned_to_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw new Error(error.message);
    return task;
  }
}