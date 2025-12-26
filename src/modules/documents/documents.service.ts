import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../config/supabase';
import { Database } from '../../types/database.types';
import { SubscriptionService } from '../subscriptions/subscriptions.service';

const db = supabase as SupabaseClient<Database>;

export class DocumentService {
  
  // Save metadata after frontend upload
  static async saveDocumentMetadata(data: any, userId: string, companyId: string) {
    // Check plan limits
    const limitCheck = await SubscriptionService.checkLimit(companyId, 'document');
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message || 'Plan limit reached');
    }

    const { data: doc, error } = await (db.from('documents') as any)
      .insert({
        ...data,
        uploaded_by: userId,
        company_id: companyId, // Ensure company_id is set
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