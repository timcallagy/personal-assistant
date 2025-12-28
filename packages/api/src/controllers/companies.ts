import { Request, Response } from 'express';
import * as companyService from '../services/companyService.js';
import { validationError } from '../lib/errors.js';

export const companiesController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const activeOnly = req.query['active'] === 'true';

    const { companies, total } = await companyService.getCompanies(userId, { activeOnly });

    res.json({
      success: true,
      data: { companies, total },
    });
  },

  get: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = parseInt(req.params['id']!, 10);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid company ID' },
      });
      return;
    }

    const company = await companyService.getCompany(userId, id);

    res.json({
      success: true,
      data: { company },
    });
  },

  create: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { name, careerPageUrl } = req.body;

    // Validate required fields
    const errors: Record<string, string> = {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors['name'] = 'Company name is required';
    }

    if (!careerPageUrl || typeof careerPageUrl !== 'string' || careerPageUrl.trim().length === 0) {
      errors['careerPageUrl'] = 'Career page URL is required';
    } else {
      try {
        new URL(careerPageUrl);
      } catch {
        errors['careerPageUrl'] = 'Invalid URL format';
      }
    }

    if (Object.keys(errors).length > 0) {
      throw validationError('Invalid company data', errors);
    }

    const company = await companyService.createCompany(userId, {
      name: name.trim(),
      careerPageUrl: careerPageUrl.trim(),
    });

    res.status(201).json({
      success: true,
      data: { company },
    });
  },

  update: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = parseInt(req.params['id']!, 10);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid company ID' },
      });
      return;
    }

    const { name, careerPageUrl, active, description, headquarters, foundedYear, revenueEstimate, stage } = req.body;
    const updateData: {
      name?: string;
      careerPageUrl?: string;
      active?: boolean;
      description?: string | null;
      headquarters?: string | null;
      foundedYear?: number | null;
      revenueEstimate?: string | null;
      stage?: string | null;
    } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw validationError('Invalid company name', { name: 'Name cannot be empty' });
      }
      updateData.name = name.trim();
    }

    if (careerPageUrl !== undefined) {
      if (typeof careerPageUrl !== 'string' || careerPageUrl.trim().length === 0) {
        throw validationError('Invalid URL', { careerPageUrl: 'URL cannot be empty' });
      }
      try {
        new URL(careerPageUrl);
      } catch {
        throw validationError('Invalid URL format', { careerPageUrl: 'Invalid URL format' });
      }
      updateData.careerPageUrl = careerPageUrl.trim();
    }

    if (active !== undefined) {
      updateData.active = Boolean(active);
    }

    // Metadata fields (allow null to clear)
    if (description !== undefined) {
      updateData.description = description ? String(description).trim() : null;
    }
    if (headquarters !== undefined) {
      updateData.headquarters = headquarters ? String(headquarters).trim() : null;
    }
    if (foundedYear !== undefined) {
      updateData.foundedYear = foundedYear ? parseInt(foundedYear, 10) : null;
    }
    if (revenueEstimate !== undefined) {
      updateData.revenueEstimate = revenueEstimate ? String(revenueEstimate).trim() : null;
    }
    if (stage !== undefined) {
      updateData.stage = stage ? String(stage).trim() : null;
    }

    const company = await companyService.updateCompany(userId, id, updateData);

    res.json({
      success: true,
      data: { company },
    });
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = parseInt(req.params['id']!, 10);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid company ID' },
      });
      return;
    }

    await companyService.deleteCompany(userId, id);

    res.json({
      success: true,
      message: 'Company deleted successfully',
    });
  },
};
