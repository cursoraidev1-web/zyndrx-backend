import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';
import {
  CreateDocumentInput,
  UpdateDocumentInput,
  GetDocumentsQuery,
} from './documents.validation';

export class DocumentsService {
  /**
   * Create a document record
   * Note: Actual file upload happens on the frontend to Supabase Storage
   * This just creates the database record
   */
  async createDocument(userId: string, data: CreateDocumentInput) {
    try {
      // Check if user has access to the project
      const hasAccess = await this.checkProjectAccess(data.projectId, userId);
      if (!hasAccess) {
        throw new AppError('Project not found or access denied', 404);
      }

      // If PRD is specified, verify it belongs to the project
      if (data.prdId) {
        const { data: prd } = await supabaseAdmin
          .from('prds')
          .select('project_id')
          .eq('id', data.prdId)
          .single();

        if (!prd || prd.project_id !== data.projectId) {
          throw new AppError('PRD not found or does not belong to this project', 400);
        }
      }

      // Create document record
      const { data: document, error } = await supabaseAdmin
        .from('documents')
        .insert({
          project_id: data.projectId,
          prd_id: data.prdId,
          title: data.title,
          file_url: data.fileUrl,
          file_type: data.fileType,
          file_size: data.fileSize,
          tags: data.tags,
          uploaded_by: userId,
        })
        .select(
          `
          *,
          uploader:users!uploaded_by(id, email, full_name, avatar_url),
          project:projects(id, name),
          prd:prds(id, title)
        `
        )
        .single();

      if (error || !document) {
        logger.error('Failed to create document', { error });
        throw new AppError('Failed to create document', 500);
      }

      logger.info('Document created successfully', {
        documentId: document.id,
        projectId: data.projectId,
        userId,
      });

      return this.formatDocument(document);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create document error', { error });
      throw new AppError('Failed to create document', 500);
    }
  }

  /**
   * Get documents with filtering and pagination
   */
  async getDocuments(userId: string, query: GetDocumentsQuery) {
    try {
      let queryBuilder = supabaseAdmin
        .from('documents')
        .select(
          `
          *,
          uploader:users!uploaded_by(id, email, full_name, avatar_url),
          project:projects(id, name),
          prd:prds(id, title)
        `,
          { count: 'exact' }
        );

      // Filter by project if provided
      if (query.projectId) {
        const hasAccess = await this.checkProjectAccess(query.projectId, userId);
        if (!hasAccess) {
          throw new AppError('Project not found or access denied', 404);
        }
        queryBuilder = queryBuilder.eq('project_id', query.projectId);
      } else {
        // Get all documents from projects user has access to
        const { data: userProjects } = await supabaseAdmin
          .from('projects')
          .select('id')
          .or(`owner_id.eq.${userId},project_members.user_id.eq.${userId}`);

        if (!userProjects || userProjects.length === 0) {
          return {
            data: [],
            pagination: { total: 0, page: 1, limit: query.limit, totalPages: 0 },
          };
        }

        const projectIds = userProjects.map((p) => p.id);
        queryBuilder = queryBuilder.in('project_id', projectIds);
      }

      // Filter by PRD if provided
      if (query.prdId) {
        queryBuilder = queryBuilder.eq('prd_id', query.prdId);
      }

      // Filter by file type
      if (query.fileType) {
        queryBuilder = queryBuilder.eq('file_type', query.fileType);
      }

      // Filter by tags
      if (query.tags) {
        const tagsArray = query.tags.split(',').map((t) => t.trim());
        queryBuilder = queryBuilder.contains('tags', tagsArray);
      }

      // Search in title
      if (query.search) {
        queryBuilder = queryBuilder.ilike('title', `%${query.search}%`);
      }

      // Pagination
      const offset = (query.page - 1) * query.limit;
      queryBuilder = queryBuilder
        .order('created_at', { ascending: false })
        .range(offset, offset + query.limit - 1);

      const { data: documents, error, count } = await queryBuilder;

      if (error) {
        logger.error('Failed to fetch documents', { error });
        throw new AppError('Failed to fetch documents', 500);
      }

      return {
        data: documents?.map((doc) => this.formatDocument(doc)) || [],
        pagination: {
          total: count || 0,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil((count || 0) / query.limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get documents error', { error });
      throw new AppError('Failed to fetch documents', 500);
    }
  }

  /**
   * Get single document by ID
   */
  async getDocumentById(documentId: string, userId: string) {
    try {
      const { data: document, error } = await supabaseAdmin
        .from('documents')
        .select(
          `
          *,
          uploader:users!uploaded_by(id, email, full_name, avatar_url, role),
          project:projects(id, name, owner_id),
          prd:prds(id, title, version)
        `
        )
        .eq('id', documentId)
        .single();

      if (error || !document) {
        throw new AppError('Document not found', 404);
      }

      // Check if user has access to the project
      const hasAccess = await this.checkProjectAccess(document.project_id, userId);
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      return this.formatDocument(document);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get document by ID error', { error });
      throw new AppError('Failed to fetch document', 500);
    }
  }

  /**
   * Update document metadata
   */
  async updateDocument(documentId: string, userId: string, data: UpdateDocumentInput) {
    try {
      // Get existing document
      const { data: existingDoc, error: fetchError } = await supabaseAdmin
        .from('documents')
        .select('*, project:projects(owner_id)')
        .eq('id', documentId)
        .single();

      if (fetchError || !existingDoc) {
        throw new AppError('Document not found', 404);
      }

      // Check if user has access
      const hasAccess = await this.checkProjectAccess(existingDoc.project_id, userId);
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      // Update the document
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
          uploader:users!uploaded_by(id, email, full_name, avatar_url),
          project:projects(id, name),
          prd:prds(id, title)
        `
        )
        .single();

      if (error || !document) {
        logger.error('Failed to update document', { error });
        throw new AppError('Failed to update document', 500);
      }

      logger.info('Document updated successfully', {
        documentId,
        userId,
      });

      return this.formatDocument(document);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update document error', { error });
      throw new AppError('Failed to update document', 500);
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string, userId: string) {
    try {
      // Get existing document
      const { data: existingDoc, error: fetchError } = await supabaseAdmin
        .from('documents')
        .select('*, project:projects(owner_id)')
        .eq('id', documentId)
        .single();

      if (fetchError || !existingDoc) {
        throw new AppError('Document not found', 404);
      }

      // Check if user is uploader or project owner
      const isUploader = existingDoc.uploaded_by === userId;
      const isOwner = existingDoc.project.owner_id === userId;

      if (!isUploader && !isOwner) {
        throw new AppError('Only the uploader or project owner can delete this document', 403);
      }

      const { error } = await supabaseAdmin.from('documents').delete().eq('id', documentId);

      if (error) {
        logger.error('Failed to delete document', { error });
        throw new AppError('Failed to delete document', 500);
      }

      logger.info('Document deleted successfully', { documentId, userId });

      return { message: 'Document deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete document error', { error });
      throw new AppError('Failed to delete document', 500);
    }
  }

  // ============ HELPER METHODS ============

  /**
   * Check if user has access to a project
   */
  private async checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (!project) return false;
    if (project.owner_id === userId) return true;

    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return !!member;
  }

  /**
   * Format document for response
   */
  private formatDocument(doc: any) {
    return {
      id: doc.id,
      projectId: doc.project_id,
      project: doc.project,
      prdId: doc.prd_id,
      prd: doc.prd,
      title: doc.title,
      fileUrl: doc.file_url,
      fileType: doc.file_type,
      fileSize: doc.file_size,
      tags: doc.tags,
      uploadedBy: doc.uploaded_by,
      uploader: doc.uploader,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    };
  }
}
