import cron from 'node-cron';
import { IntegrationsService } from './integrations.service';
import { supabaseAdmin } from '../../config/supabase';
import logger from '../../utils/logger';

const db = supabaseAdmin;

/**
 * Integration Sync Scheduler
 * Automatically syncs active integrations on a schedule
 */
export class IntegrationScheduler {
  private static isRunning = false;

  /**
   * Start the scheduler
   * Syncs active integrations every 15 minutes
   */
  static start() {
    // Run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      if (this.isRunning) {
        logger.debug('Integration sync already running, skipping');
        return;
      }

      this.isRunning = true;
      logger.info('Starting scheduled integration sync');

      try {
        await this.syncAllActiveIntegrations();
      } catch (error: any) {
        logger.error('Scheduled integration sync failed', {
          error: error.message,
        });
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('Integration scheduler started (runs every 15 minutes)');
  }

  /**
   * Sync all active integrations
   */
  private static async syncAllActiveIntegrations() {
    try {
      // Get all active integrations
      const { data: integrations, error } = await (db.from('integrations') as any)
        .select('*')
        .eq('is_connected', true)
        .eq('is_active', true);

      if (error) {
        logger.error('Failed to fetch active integrations', { error: error.message });
        return;
      }

      if (!integrations || integrations.length === 0) {
        logger.debug('No active integrations to sync');
        return;
      }

      logger.info(`Syncing ${integrations.length} active integrations`);

      // Sync each integration
      for (const integration of integrations) {
        try {
          await IntegrationsService.syncIntegration(
            integration.id,
            integration.company_id
          );
          logger.debug('Integration synced successfully', {
            integrationId: integration.id,
            type: integration.type,
            companyId: integration.company_id,
          });
        } catch (error: any) {
          logger.error('Failed to sync integration', {
            integrationId: integration.id,
            type: integration.type,
            error: error.message,
          });
          // Continue with other integrations even if one fails
        }
      }

      logger.info('Scheduled integration sync completed', {
        count: integrations.length,
      });
    } catch (error: any) {
      logger.error('Error in syncAllActiveIntegrations', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  static stop() {
    // Cron jobs are managed globally, so we just log
    logger.info('Integration scheduler stop requested');
    // Note: In a production environment, you might want to track the cron job
    // and actually stop it. For now, this is informational.
  }
}
