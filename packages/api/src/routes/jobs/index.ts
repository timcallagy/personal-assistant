import { Router } from 'express';
import { companiesRouter } from './companies.js';
import { profileRouter } from './profile.js';

const router = Router();

// Mount sub-routers
router.use('/companies', companiesRouter);
router.use('/profile', profileRouter);

export { router as jobsRouter };
