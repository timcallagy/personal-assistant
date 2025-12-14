/**
 * Job Matching Service
 * Calculates match scores between jobs and user profiles
 */

import type { JobProfile } from '@pa/shared';
import type { ParsedJob } from './atsParsers/types.js';

/**
 * Configuration for match scoring weights
 */
const SCORING_WEIGHTS = {
  TITLE_MATCH: 40, // Max points for title match
  KEYWORD_MATCH: 30, // Max points for keyword matches
  LOCATION_MATCH: 20, // Max points for location match
  REMOTE_MATCH: 10, // Max points for remote preference match
};

const MAX_SCORE = 100;

/**
 * Calculate a match score between a job and a user's profile
 * @param job The parsed job to score
 * @param profile The user's job profile preferences
 * @returns Score from 0-100
 */
export function calculateMatchScore(
  job: ParsedJob | { title: string; description?: string | null; department?: string | null; location?: string | null; remote?: boolean },
  profile: JobProfile | null
): number {
  // If no profile, return neutral score
  if (!profile) {
    return 50;
  }

  let score = 0;

  // Title match (40 points)
  score += calculateTitleScore(job.title, profile.titles);

  // Keyword match (30 points)
  const content = buildSearchableContent(job);
  score += calculateKeywordScore(content, profile.keywords);

  // Location match (20 points)
  if (job.location) {
    score += calculateLocationScore(job.location, profile.locations);
  }

  // Remote preference match (10 points)
  score += calculateRemoteScore(job.remote ?? false, profile.remoteOnly);

  return Math.min(MAX_SCORE, score);
}

/**
 * Calculate title match score
 * Awards full points if any profile title is found in the job title
 */
function calculateTitleScore(jobTitle: string, profileTitles: string[]): number {
  if (profileTitles.length === 0) {
    return SCORING_WEIGHTS.TITLE_MATCH; // No preferences = full points
  }

  const titleLower = jobTitle.toLowerCase();

  for (const title of profileTitles) {
    if (titleLower.includes(title.toLowerCase())) {
      return SCORING_WEIGHTS.TITLE_MATCH;
    }
  }

  // Partial match - check for overlapping words
  const jobWords = new Set(titleLower.split(/\s+/).filter((w) => w.length > 2));
  for (const title of profileTitles) {
    const titleWords = title.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const matchingWords = titleWords.filter((w) => jobWords.has(w));
    if (matchingWords.length > 0) {
      // Award partial points based on word overlap
      return Math.floor((matchingWords.length / titleWords.length) * SCORING_WEIGHTS.TITLE_MATCH);
    }
  }

  return 0;
}

/**
 * Calculate keyword match score
 * Awards points based on how many keywords are found (up to 30 points)
 */
function calculateKeywordScore(content: string, keywords: string[]): number {
  if (keywords.length === 0) {
    return SCORING_WEIGHTS.KEYWORD_MATCH; // No preferences = full points
  }

  const contentLower = content.toLowerCase();
  const matchedKeywords = keywords.filter((k) => contentLower.includes(k.toLowerCase()));

  // Award 10 points per keyword, up to max
  const pointsPerKeyword = 10;
  return Math.min(SCORING_WEIGHTS.KEYWORD_MATCH, matchedKeywords.length * pointsPerKeyword);
}

/**
 * Calculate location match score
 */
function calculateLocationScore(jobLocation: string, profileLocations: string[]): number {
  if (profileLocations.length === 0) {
    return SCORING_WEIGHTS.LOCATION_MATCH; // No preferences = full points
  }

  const locationLower = jobLocation.toLowerCase();

  for (const loc of profileLocations) {
    if (locationLower.includes(loc.toLowerCase())) {
      return SCORING_WEIGHTS.LOCATION_MATCH;
    }
  }

  return 0;
}

/**
 * Calculate remote preference score
 */
function calculateRemoteScore(isRemote: boolean, remoteOnly: boolean): number {
  if (remoteOnly) {
    // User wants remote only - award points only for remote jobs
    return isRemote ? SCORING_WEIGHTS.REMOTE_MATCH : 0;
  }

  // User is flexible - always award points
  return SCORING_WEIGHTS.REMOTE_MATCH;
}

/**
 * Build a searchable content string from job fields
 */
function buildSearchableContent(job: {
  title: string;
  description?: string | null;
  department?: string | null;
}): string {
  const parts = [job.title];

  if (job.description) {
    parts.push(job.description);
  }

  if (job.department) {
    parts.push(job.department);
  }

  return parts.join(' ');
}

/**
 * Batch calculate match scores for multiple jobs
 */
export function calculateMatchScores(
  jobs: ParsedJob[],
  profile: JobProfile | null
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const job of jobs) {
    scores.set(job.externalId, calculateMatchScore(job, profile));
  }

  return scores;
}
