import { Request, Response } from 'express';
import { PRDService } from './prd.service';
import { ResponseHandler } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import logger from '../../utils/logger';

/**
 * PRD Controller
 * Handles HTTP requests and responses for PRD endpoints
 */
export class PRDController {
  private prdService: PRDService;

  constructor() {
    this.prdService = new PRDService();
  }

  /**
   * Create a new PRD
   * POST /api/v1/prds
   */
  createPRD = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const prd = await this.prdService.createPRD(req.user.id, req.body);

    logger.info('PRD created', {
      prdId: prd.id,
      projectId: req.body.projectId,
      userId: req.user.id,
    });

    return ResponseHandler.created(res, prd, 'PRD created successfully');
  });

  /**
   * Get PRDs with filtering and pagination
   * GET /api/v1/prds
   */
  getPRDs = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const result = await this.prdService.getPRDs(req.user.id, req.query as any);

    return ResponseHandler.success(
      res,
      {
        prds: result.data,
        pagination: result.pagination,
      },
      'PRDs retrieved successfully'
    );
  });

  /**
   * Get single PRD by ID with version history
   * GET /api/v1/prds/:id
   */
  getPRDById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const includeVersions = req.query.includeVersions !== 'false'; // default true

    const prd = await this.prdService.getPRDById(id, req.user.id, includeVersions);

    return ResponseHandler.success(res, prd, 'PRD retrieved successfully');
  });

  /**
   * Update PRD content (creates new version)
   * PUT /api/v1/prds/:id
   */
  updatePRD = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const prd = await this.prdService.updatePRD(id, req.user.id, req.body);

    logger.info('PRD updated', {
      prdId: id,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, prd, 'PRD updated successfully');
  });

  /**
   * Update PRD status (submit, approve, reject)
   * PATCH /api/v1/prds/:id/status
   */
  updatePRDStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const prd = await this.prdService.updatePRDStatus(id, req.user.id, req.body);

    logger.info('PRD status updated', {
      prdId: id,
      status: req.body.status,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, prd, `PRD status updated to ${req.body.status}`);
  });

  /**
   * Delete PRD
   * DELETE /api/v1/prds/:id
   */
  deletePRD = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const result = await this.prdService.deletePRD(id, req.user.id);

    logger.info('PRD deleted', {
      prdId: id,
      userId: req.user.id,
    });

    return ResponseHandler.success(res, result, 'PRD deleted successfully');
  });

  /**
   * Get PRD version history
   * GET /api/v1/prds/:id/versions
   */
  getPRDVersions = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const versions = await this.prdService.getPRDVersions(id, req.user.id);

    return ResponseHandler.success(
      res,
      { versions },
      'PRD versions retrieved successfully'
    );
  });

  /**
   * Get PRD statistics for a project
   * GET /api/v1/prds/project/:projectId/stats
   */
  getPRDStats = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { projectId } = req.params;

    // Get all PRDs for the project
    const result = await this.prdService.getPRDs(req.user.id, {
      projectId,
      page: 1,
      limit: 1000, // Get all
      sortBy: 'created_at',
      sortOrder: 'desc',
    });

    const prds = result.data;

    // Calculate statistics
    const stats = {
      total: prds.length,
      byStatus: {
        draft: prds.filter((p) => p.status === 'draft').length,
        in_review: prds.filter((p) => p.status === 'in_review').length,
        approved: prds.filter((p) => p.status === 'approved').length,
        rejected: prds.filter((p) => p.status === 'rejected').length,
      },
      recentlyCreated: prds.slice(0, 5).map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        createdAt: p.createdAt,
      })),
      approvalRate: prds.length > 0
        ? ((prds.filter((p) => p.status === 'approved').length / prds.length) * 100).toFixed(2)
        : 0,
    };

    return ResponseHandler.success(res, stats, 'PRD statistics retrieved successfully');
  });

  /**
   * Export PRD to different formats
   * GET /api/v1/prds/:id/export
   */
  exportPRD = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res);
    }

    const { id } = req.params;
    const format = (req.query.format as string) || 'json';

    const prd = await this.prdService.getPRDById(id, req.user.id, false);

    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="prd-${prd.id}.json"`);
        return res.json(prd);

      case 'markdown':
        const markdown = this.convertToMarkdown(prd);
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="prd-${prd.title.replace(/\s+/g, '-')}.md"`);
        return res.send(markdown);

      default:
        return ResponseHandler.success(res, prd, 'Export format not supported yet');
    }
  });

  /**
   * Helper: Convert PRD to Markdown format
   */
  private convertToMarkdown(prd: any): string {
    let md = `# ${prd.title}\n\n`;
    md += `**Version:** ${prd.version}\n`;
    md += `**Status:** ${prd.status}\n`;
    md += `**Created:** ${new Date(prd.createdAt).toLocaleDateString()}\n`;
    md += `**Project:** ${prd.project?.name || 'N/A'}\n\n`;
    md += `---\n\n`;

    const content = prd.content;

    if (content.overview) {
      md += `## Overview\n\n${content.overview}\n\n`;
    }

    if (content.objectives && content.objectives.length > 0) {
      md += `## Objectives\n\n`;
      content.objectives.forEach((obj: string) => {
        md += `- ${obj}\n`;
      });
      md += `\n`;
    }

    if (content.functionalRequirements && content.functionalRequirements.length > 0) {
      md += `## Functional Requirements\n\n`;
      content.functionalRequirements.forEach((req: any) => {
        md += `### ${req.title} (${req.priority})\n\n`;
        md += `${req.description}\n\n`;
      });
    }

    if (content.userStories && content.userStories.length > 0) {
      md += `## User Stories\n\n`;
      content.userStories.forEach((story: any) => {
        md += `**As a** ${story.role}, **I want to** ${story.goal}, **so that** ${story.benefit}\n\n`;
        if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
          md += `**Acceptance Criteria:**\n`;
          story.acceptanceCriteria.forEach((criteria: string) => {
            md += `- ${criteria}\n`;
          });
          md += `\n`;
        }
      });
    }

    if (content.timeline) {
      md += `## Timeline\n\n`;
      if (content.timeline.estimatedStartDate) {
        md += `**Start Date:** ${content.timeline.estimatedStartDate}\n`;
      }
      if (content.timeline.estimatedEndDate) {
        md += `**End Date:** ${content.timeline.estimatedEndDate}\n`;
      }
      md += `\n`;
    }

    if (content.successMetrics && content.successMetrics.length > 0) {
      md += `## Success Metrics\n\n`;
      content.successMetrics.forEach((metric: any) => {
        md += `- **${metric.metric}:** ${metric.target} (${metric.measurement})\n`;
      });
      md += `\n`;
    }

    if (content.risks && content.risks.length > 0) {
      md += `## Risks\n\n`;
      content.risks.forEach((risk: any) => {
        md += `- **${risk.risk}** (${risk.impact} impact)\n`;
        md += `  - Mitigation: ${risk.mitigation}\n`;
      });
      md += `\n`;
    }

    if (content.notes) {
      md += `## Additional Notes\n\n${content.notes}\n\n`;
    }

    return md;
  }
}
