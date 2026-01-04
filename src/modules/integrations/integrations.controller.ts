import { Request, Response, NextFunction } from 'express';
import { IntegrationsService } from './integrations.service';
import { ResponseHandler } from '../../utils/response';

export const getIntegrations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = (req as any).user.companyId;
    const { project_id } = req.query;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const integrations = await IntegrationsService.getIntegrations(
      companyId,
      project_id as string | undefined
    );

    return ResponseHandler.success(res, integrations, 'Integrations fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getIntegration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const integration = await IntegrationsService.getIntegrationById(id, companyId);
    return ResponseHandler.success(res, integration, 'Integration fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const connectIntegration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const companyId = (req as any).user.companyId;
    // Support both /integrations/:id/connect and /integrations/connect
    const integrationType = req.params.id || req.body.id || req.body.type;
    const { config, project_id } = req.body;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    if (!integrationType) {
      return ResponseHandler.error(res, 'Integration type is required', 400);
    }

    const integration = await IntegrationsService.connectIntegration(
      integrationType,
      companyId,
      userId,
      config || {},
      project_id
    );

    return ResponseHandler.created(res, integration, 'Integration connected successfully');
  } catch (error) {
    next(error);
  }
};

export const disconnectIntegration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    await IntegrationsService.disconnectIntegration(id, companyId);
    return ResponseHandler.success(res, null, 'Integration disconnected successfully');
  } catch (error) {
    next(error);
  }
};

export const updateIntegrationConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;
    const { config } = req.body;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    if (!config || typeof config !== 'object') {
      return ResponseHandler.error(res, 'Configuration object is required', 400);
    }

    const integration = await IntegrationsService.updateIntegrationConfig(id, companyId, config);
    return ResponseHandler.success(res, integration, 'Configuration updated successfully');
  } catch (error) {
    next(error);
  }
};

export const syncIntegration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;

    if (!companyId) {
      return ResponseHandler.error(res, 'Company context required', 400);
    }

    const result = await IntegrationsService.syncIntegration(id, companyId);
    return ResponseHandler.success(res, result, 'Integration sync initiated successfully');
  } catch (error) {
    next(error);
  }
};

