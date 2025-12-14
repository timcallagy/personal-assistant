import { Router } from 'express';
import { companiesRouter } from './companies.js';
import { profileRouter } from './profile.js';
import { crawlRouter } from './crawl.js';
import { listingsRouter } from './listings.js';

const router = Router();

// Mount sub-routers
router.use('/companies', companiesRouter);
router.use('/profile', profileRouter);
router.use('/crawl', crawlRouter);
router.use('/listings', listingsRouter);

export { router as jobsRouter };
