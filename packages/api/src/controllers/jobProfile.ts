import { Request, Response } from 'express';
import * as jobProfileService from '../services/jobProfileService.js';
import { validationError } from '../lib/errors.js';

export const jobProfileController = {
  get: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const profile = await jobProfileService.getJobProfile(userId);

    res.json({
      success: true,
      data: { profile },
    });
  },

  upsert: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { keywords, titles, locations, remoteOnly } = req.body;

    // Validate arrays
    const errors: Record<string, string> = {};

    if (keywords !== undefined && !Array.isArray(keywords)) {
      errors['keywords'] = 'Keywords must be an array of strings';
    }

    if (titles !== undefined && !Array.isArray(titles)) {
      errors['titles'] = 'Titles must be an array of strings';
    }

    if (locations !== undefined && !Array.isArray(locations)) {
      errors['locations'] = 'Locations must be an array of strings';
    }

    if (Object.keys(errors).length > 0) {
      throw validationError('Invalid profile data', errors);
    }

    const profile = await jobProfileService.upsertJobProfile(userId, {
      keywords: keywords?.map((k: unknown) => String(k).trim()).filter(Boolean),
      titles: titles?.map((t: unknown) => String(t).trim()).filter(Boolean),
      locations: locations?.map((l: unknown) => String(l).trim()).filter(Boolean),
      remoteOnly: remoteOnly !== undefined ? Boolean(remoteOnly) : undefined,
    });

    res.json({
      success: true,
      data: { profile },
    });
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    await jobProfileService.deleteJobProfile(userId);

    res.json({
      success: true,
      message: 'Job profile deleted successfully',
    });
  },
};
