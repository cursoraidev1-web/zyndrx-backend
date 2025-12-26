import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';
import { SubscriptionService } from '../subscriptions/subscriptions.service';

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

  static async createTask(data: any, userId: string, companyId: string) {
    const { data: project } = await db.from('projects').select('company_id').eq('id', data.project_id).single();
    if (!project) throw new Error('Project not found');

    // Ensure company_id matches
    const projectCompanyId = (project as any).company_id;
    if (projectCompanyId !== companyId) {
      throw new Error('Project does not belong to your company');
    }

    // Check plan limits
    const limitCheck = await SubscriptionService.checkLimit(companyId, 'task');
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message || 'Plan limit reached');
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