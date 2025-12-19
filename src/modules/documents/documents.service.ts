import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';

const db = supabase as SupabaseClient<Database>;

export class DocumentService {
  
  // Save metadata after frontend upload
  static async saveDocumentMetadata(data: any, userId: string) {
    const { data: doc, error } = await (db.from('documents') as any)
      .insert({
        ...data,
        uploaded_by: userId
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return doc;
  }

  static async getProjectDocuments(projectId: string) {
    const { data, error } = await db
      .from('documents')
      .select('*, uploader:users!documents_uploaded_by_fkey(full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
}