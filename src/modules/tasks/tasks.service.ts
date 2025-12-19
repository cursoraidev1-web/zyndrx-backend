import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';

// Use 'any' cast for write operations where types conflict, typed client for reads
const db = supabase as SupabaseClient<Database>;

export class TaskService {
  
  // 1. Get Tasks for a Project (The Kanban Board Data)
  static async getTasksByProject(projectId: string) {
    const { data, error } = await db
      .from('tasks')
      .select(`
        *,
        assignee:users!tasks_assigned_to_fkey(id, full_name, avatar_url),
        reporter:users!tasks_created_by_fkey(full_name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }); // Oldest first (FIFO)

    if (error) throw new Error(error.message);
    return data;
  }

  // 2. Create Manual Task
  static async createTask(data: any, userId: string) {
    const { data: task, error } = await (db.from('tasks') as any)
      .insert({
        ...data,
        created_by: userId,
        status: 'todo' // Default
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return task;
  }

  // 3. Update Task (Move card, Assign User)
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