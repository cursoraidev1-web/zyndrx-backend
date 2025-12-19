import supabase from '../../config/supabase';

export class AnalyticsService {
  
  static async getProjectStats(projectId: string) {
    // FIX: Cast the query result to 'any' to stop the 'never' error
    const { data } = await supabase
      .from('tasks')
      .select('status')
      .eq('project_id', projectId);

    // Treat 'tasks' as any[] to allow .filter access
    const tasks = (data || []) as any[];

    const taskStats = {
      todo: tasks.filter((t: any) => t.status === 'todo').length || 0,
      in_progress: tasks.filter((t: any) => t.status === 'in_progress').length || 0,
      completed: tasks.filter((t: any) => t.status === 'completed').length || 0,
      total: tasks.length || 0
    };

    // 2. PRD Count
    const { count: prdCount } = await supabase
      .from('prds')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    return {
      tasks: taskStats,
      prds: prdCount || 0
    };
  }
}