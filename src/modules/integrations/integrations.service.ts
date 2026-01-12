import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { Database } from '../../types/database.types';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

const db = supabaseAdmin as SupabaseClient<Database>;

export class IntegrationsService {
  
  // Available integrations catalog
  static readonly AVAILABLE_INTEGRATIONS = [
    {
      id: 'github',
      name: 'GitHub',
      description: 'Connect your GitHub repositories to sync commits, pull requests, and issues.',
      category: 'Development',
      icon: 'github',
      color: '#181717'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Get notifications and updates directly in your Slack workspace.',
      category: 'Communication',
      icon: 'slack',
      color: '#4A154B'
    },
    {
      id: 'jira',
      name: 'Jira',
      description: 'Sync tasks and issues between ZynDrx and Jira.',
      category: 'Project Management',
      icon: 'jira',
      color: '#0052CC'
    },
    {
      id: 'figma',
      name: 'Figma',
      description: 'Import designs and assets directly from Figma.',
      category: 'Design',
      icon: 'figma',
      color: '#F24E1E'
    },
    {
      id: 'linear',
      name: 'Linear',
      description: 'Sync issues and tasks with Linear.',
      category: 'Project Management',
      icon: 'linear',
      color: '#5E6AD2'
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Connect ZynDrx with 5000+ apps via Zapier.',
      category: 'Automation',
      icon: 'zapier',
      color: '#FF4A00'
    }
  ];

  // Get all available integrations with connection status
  static async getIntegrations(companyId: string, projectId?: string) {
    try {
      // Get available integrations catalog
      const catalog = this.AVAILABLE_INTEGRATIONS;

      // Get connected integrations from database
      let query = db
        .from('integrations')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_connected', true);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: connectedIntegrations, error } = await query;

      if (error) {
        logger.error('Failed to fetch connected integrations', { error: error.message, companyId });
        throw new AppError(`Failed to fetch integrations: ${error.message}`, 500);
      }

      // Map catalog with connection status
      const integrations = catalog.map(catalogItem => {
        const connected = (connectedIntegrations as any[])?.find(
          (ci: any) => ci.type === catalogItem.id && (!projectId || ci.project_id === projectId)
        );

        return {
          ...catalogItem,
          connected: !!connected,
          integration_id: connected?.id || null,
          connected_at: connected?.connected_at || null,
          last_sync_at: connected?.last_sync_at || null,
          config: connected?.config || {},
          is_active: connected?.is_active ?? true
        };
      });

      return integrations;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get integrations error', { error, companyId });
      throw new AppError('Failed to fetch integrations', 500);
    }
  }

  // Get single integration
  static async getIntegrationById(integrationId: string, companyId: string) {
    try {
      const { data: integration, error } = await db
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('company_id', companyId)
        .single();

      if (error || !integration) {
        throw new AppError('Integration not found', 404);
      }

      // Get catalog info
      const catalogItem = this.AVAILABLE_INTEGRATIONS.find(item => item.id === (integration as any).type);
      
      return {
        ...catalogItem,
        ...(integration as any),
        connected: (integration as any).is_connected
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get integration error', { error, integrationId });
      throw new AppError('Failed to fetch integration', 500);
    }
  }

  // Connect an integration
  static async connectIntegration(
    type: string,
    companyId: string,
    userId: string,
    config: any = {},
    projectId?: string
  ) {
    try {
      // Validate integration type
      const catalogItem = this.AVAILABLE_INTEGRATIONS.find(item => item.id === type);
      if (!catalogItem) {
        throw new AppError(`Integration type '${type}' is not supported`, 400);
      }

      // Check if already connected
      let query = db
        .from('integrations')
        .select('*')
        .eq('company_id', companyId)
        .eq('type', type)
        .eq('is_connected', true);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: existing } = await query;

      if (existing && existing.length > 0) {
        // Update existing integration
        const existingIntegration = existing[0] as any;
        const { data: updated, error } = await (db.from('integrations') as any)
          .update({
            config: config,
            is_connected: true,
            is_active: true,
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingIntegration.id)
          .select()
          .single();

        if (error) {
          throw new AppError(`Failed to update integration: ${error.message}`, 500);
        }

        return {
          ...catalogItem,
          ...updated,
          connected: true
        };
      }

      // Create new integration
      const { data: integration, error } = await (db.from('integrations') as any)
        .insert({
          company_id: companyId,
          project_id: projectId || null,
          type: type,
          name: catalogItem.name,
          description: catalogItem.description,
          category: catalogItem.category,
          is_active: true,
          is_connected: true,
          config: config,
          credentials: {},
          metadata: {},
          created_by: userId,
          connected_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create integration', { error: error.message, type, companyId });
        throw new AppError(`Failed to connect integration: ${error.message}`, 500);
      }

      return {
        ...catalogItem,
        ...integration,
        connected: true
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Connect integration error', { error, type, companyId });
      throw new AppError('Failed to connect integration', 500);
    }
  }

  // Disconnect an integration
  static async disconnectIntegration(integrationId: string, companyId: string) {
    try {
      const { data: integration, error: fetchError } = await db
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !integration) {
        throw new AppError('Integration not found', 404);
      }

      const { data: updated, error } = await (db.from('integrations') as any)
        .update({
          is_connected: false,
          is_active: false,
          credentials: {},
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to disconnect integration', { error: error.message, integrationId });
        throw new AppError(`Failed to disconnect integration: ${error.message}`, 500);
      }

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Disconnect integration error', { error, integrationId });
      throw new AppError('Failed to disconnect integration', 500);
    }
  }

  // Update integration configuration
  static async updateIntegrationConfig(
    integrationId: string,
    companyId: string,
    config: any
  ) {
    try {
      const { data: integration, error: fetchError } = await db
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !integration) {
        throw new AppError('Integration not found', 404);
      }

      const integrationData = integration as any;
      const { data: updated, error } = await (db.from('integrations') as any)
        .update({
          config: { ...(integrationData.config || {}), ...config },
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update integration config', { error: error.message, integrationId });
        throw new AppError(`Failed to update configuration: ${error.message}`, 500);
      }

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update integration config error', { error, integrationId });
      throw new AppError('Failed to update configuration', 500);
    }
  }

  // Sync integration (trigger manual sync)
  static async syncIntegration(integrationId: string, companyId: string) {
    try {
      const { data: integration, error: fetchError } = await db
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !integration) {
        throw new AppError('Integration not found', 404);
      }

      const integrationData = integration as any;
      if (!integrationData.is_connected) {
        throw new AppError('Integration is not connected', 400);
      }

      // Update last_sync_at
      const { data: updated, error } = await (db.from('integrations') as any)
        .update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to sync integration', { error: error.message, integrationId });
        throw new AppError(`Failed to sync integration: ${error.message}`, 500);
      }

      // TODO: Implement actual sync logic based on integration type
      // For now, just update the timestamp

      return {
        ...updated,
        message: 'Sync initiated successfully'
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Sync integration error', { error, integrationId });
      throw new AppError('Failed to sync integration', 500);
    }
  }

  /**
   * Sync GitHub integration
   * Syncs repositories, issues, and pull requests from GitHub
   */
  private static async syncGitHubIntegration(integration: any, companyId: string) {
    try {
      const config = integration.config || {};
      const accessToken = config.access_token;
      
      if (!accessToken) {
        logger.warn('GitHub integration missing access token', { integrationId: integration.id });
        return;
      }

      // Import GitHub service dynamically to avoid circular dependencies
      const GitHubServiceModule = await import('../github/github.service');
      const GitHubService = GitHubServiceModule.GithubService;
      
      // Sync repositories
      if (config.sync_repositories !== false) {
        await GitHubService.syncRepositories(companyId, config);
        logger.info('GitHub repositories synced', { integrationId: integration.id, companyId });
      }

      // Sync issues (convert to tasks)
      if (config.sync_issues !== false && integration.project_id) {
        await GitHubService.syncIssues(integration.project_id, companyId, config);
        logger.info('GitHub issues synced', { integrationId: integration.id, companyId, projectId: integration.project_id });
      }

      // Sync pull requests
      if (config.sync_pull_requests !== false && integration.project_id) {
        await GitHubService.syncPullRequests(integration.project_id, companyId, config);
        logger.info('GitHub pull requests synced', { integrationId: integration.id, companyId, projectId: integration.project_id });
      }
    } catch (error: any) {
      logger.error('GitHub sync error', {
        error: error.message,
        integrationId: integration.id,
        companyId,
      });
      // Don't throw - allow sync to continue for other integrations
    }
  }
}

