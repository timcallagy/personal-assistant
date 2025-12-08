import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { config } from '../../../config.js';
import { asyncHandler } from '../../../middleware/index.js';
import { validationError } from '../../../lib/errors.js';

const router = Router();

// Ensure upload directory exists
const uploadDir = config.uploadDir;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename with original extension
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter - only allow images
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

/**
 * POST /api/v1/blog/admin/images
 * Upload an image
 */
router.post(
  '/',
  upload.single('image'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw validationError('No image file provided');
    }

    // Build the public URL for the image
    const imageUrl = `/api/v1/blog/images/${req.file.filename}`;

    res.status(201).json({
      success: true,
      data: {
        filename: req.file.filename,
        url: imageUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  })
);

/**
 * GET /api/v1/blog/admin/images
 * List all uploaded images
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const files = fs.readdirSync(uploadDir);

    const images = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map((filename) => {
        const filepath = path.join(uploadDir, filename);
        const stats = fs.statSync(filepath);
        return {
          filename,
          url: `/api/v1/blog/images/${filename}`,
          size: stats.size,
          uploadedAt: stats.mtime,
        };
      })
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

    res.json({
      success: true,
      data: { images },
    });
  })
);

/**
 * DELETE /api/v1/blog/admin/images/:filename
 * Delete an uploaded image
 */
router.delete(
  '/:filename',
  asyncHandler(async (req: Request, res: Response) => {
    const filename = req.params['filename'];

    if (!filename) {
      throw validationError('Filename is required');
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filepath = path.join(uploadDir, sanitizedFilename);

    if (!fs.existsSync(filepath)) {
      throw validationError('Image not found');
    }

    fs.unlinkSync(filepath);

    res.status(204).send();
  })
);

export { router as adminImagesRouter };
