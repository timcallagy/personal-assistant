import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../../config.js';
import { notFoundError } from '../../lib/errors.js';

const router = Router();

/**
 * GET /api/v1/blog/images/:filename
 * Serve an uploaded image (public, no auth required)
 */
router.get('/:filename', (req: Request, res: Response) => {
  const filename = req.params['filename'];

  if (!filename) {
    throw notFoundError('Image not found');
  }

  // Sanitize filename to prevent directory traversal
  const sanitizedFilename = path.basename(filename);
  const filepath = path.join(config.uploadDir, sanitizedFilename);

  // Check if file exists
  if (!fs.existsSync(filepath)) {
    throw notFoundError('Image not found');
  }

  // Get file extension for content type
  const ext = path.extname(sanitizedFilename).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';

  // Set caching headers (1 year for immutable content)
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  // Stream the file
  const stream = fs.createReadStream(filepath);
  stream.pipe(res);
});

export { router as imagesRouter };
