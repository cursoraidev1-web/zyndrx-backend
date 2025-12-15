import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

export interface CreateDocumentData {
  projectId: string;
  prdId?: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  tags?: string[];
  uploadedBy: string;
}

export interface UpdateDocumentData {
  title?: string;
  tags?: string[];
}

export class DocumentService {
  async create(data: CreateDocumentData) {
    try {
      // Verify project access
      await this.verifyProjectAccess(data.projectId, data.uploadedBy);

      // Verify PRD if provided
      if (data.prdId) {
        const { data: prd } = await supabaseAdmin
          .from('prds')
          .select('id')
          .eq('id', data.prdId)
          .eq('project_id', data.projectId)
          .single();

        if (!prd) {
          throw new AppError('PRD not found in this project', 404);
        }
      }

      const { data: document, error } = await supabaseAdmin
        .from('documents')
        .insert({
          project_id: data.projectId,
          prd_id: data.prdId,
          title: data.title,
          file_url: data.fileUrl,
          file_type: data.fileType,
          file_size: data.fileSize,
          tags: data.tags || [],
          uploaded_by: data.uploadedBy,
        })
        .select(
          `
          *,
          uploader:users!documents_uploaded_by_fkey(id, full_name, avatar_url)
        `
        )
        .single();

      if (error || !document) {
        logger.error('Failed to create document', { error });
        throw new AppError('Failed to create document', 500);
      }

      return this.formatDocument(document);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Document creation error', { error });
      throw new AppError('Failed to create document', 500);
    }
  }

  async getById(documentId: string, userId: string) {
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select(
        `
        *,
        project:projects(id, name),
        prd:prds(id, title),
        uploader:users!documents_uploaded_by_fkey(id, full_name, avatar_url)
      `
      )
      .eq('id', documentId)
      .single();

    if (error || !document) {
      throw new AppError('Document not found', 404);
    }

    // Verify user has access
    await this.verifyProjectAccess(document.project_id, userId);

    return this.formatDocument(document);
  }

  async getByProject(
    projectId: string,
    userId: string,
    filters?: { tags?: string[]; prdId?: string; page?: number; limit?: number }
  ) {
    // Verify access
    await this.verifyProjectAccess(projectId, userId);

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('documents')
      .select(
        `
        *,
        uploader:users!documents_uploaded_by_fkey(id, full_name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.prdId) {
      query = query.eq('prd_id', filters.prdId);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    const { data: documents, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch documents', { error });
      throw new AppError('Failed to fetch documents', 500);
    }

    return {
      documents: documents?.map((doc) => this.formatDocument(doc)) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async update(documentId: string, userId: string, data: UpdateDocumentData) {
    // Get existing document
    const { data: existingDoc, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('project_id, uploaded_by')
      .eq('id', documentId)
      .single();

    if (fetchError || !existingDoc) {
      throw new AppError('Document not found', 404);
    }

    // Verify access
    await this.verifyProjectAccess(existingDoc.project_id, userId);

    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .update({
        title: data.title,
        tags: data.tags,
      })
      .eq('id', documentId)
      .select(
        `
        *,
        uploader:users!documents_uploaded_by_fkey(id, full_name, avatar_url)
      `
      )
      .single();

    if (error || !document) {
      logger.error('Failed to update document', { error });
      throw new AppError('Failed to update document', 500);
    }

    return this.formatDocument(document);
  }

  async delete(documentId: string, userId: string) {
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('project_id, uploaded_by, file_url')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      throw new AppError('Document not found', 404);
    }

    // Verify access
    await this.verifyProjectAccess(document.project_id, userId);

    // Only uploader or project owner can delete
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', document.project_id)
      .single();

    if (document.uploaded_by !== userId && project?.owner_id !== userId) {
      throw new AppError('Not authorized to delete this document', 403);
    }

    // Delete from database
    const { error } = await supabaseAdmin.from('documents').delete().eq('id', documentId);

    if (error) {
      logger.error('Failed to delete document', { error });
      throw new AppError('Failed to delete document', 500);
    }

    // TODO: Delete file from Supabase Storage
    // Extract bucket and path from file_url and delete

    return { message: 'Document deleted successfully' };
  }

  async getUploadUrl(projectId: string, userId: string, fileName: string, fileType: string) {
    // Verify access
    await this.verifyProjectAccess(projectId, userId);

    const bucket = 'documents';
    const filePath = `${projectId}/${Date.now()}-${fileName}`;

    // Generate signed upload URL
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      logger.error('Failed to generate upload URL', { error });
      throw new AppError('Failed to generate upload URL', 500);
    }

    return {
      uploadUrl: data.signedUrl,
      filePath,
      bucket,
    };
  }

  private async verifyProjectAccess(projectId: string, userId: string) {
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single();

      if (!project || project.owner_id !== userId) {
        throw new AppError('Access denied to this project', 403);
      }
    }
  }

  private formatDocument(document: any) {
    return {
      id: document.id,
      projectId: document.project_id,
      prdId: document.prd_id,
      title: document.title,
      fileUrl: document.file_url,
      fileType: document.file_type,
      fileSize: document.file_size,
      tags: document.tags,
      uploadedBy: document.uploaded_by,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
      uploader: document.uploader,
      project: document.project,
      prd: document.prd,
    };
  }
}
