/**
 * Job Matching Service
 * Calculates match scores between jobs and user profiles
 */

import type { JobProfile } from '@pa/shared';
import type { ParsedJob } from './atsParsers/types.js';

/**
 * Check if a term appears as a whole word in the text
 * Uses word boundary matching to avoid "US" matching "Austin"
 */
function matchesAsWord(text: string, term: string): boolean {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
  return regex.test(text);
}

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

  // Check which preferences the user has actually set
  const hasTitles = profile.titles && profile.titles.length > 0;
  const hasKeywords = profile.keywords && profile.keywords.length > 0;
  const hasLocations = profile.locations && profile.locations.length > 0;
  const hasRemotePreference = profile.remoteOnly === true;

  // If no preferences set at all, return neutral score
  if (!hasTitles && !hasKeywords && !hasLocations && !hasRemotePreference) {
    return 50;
  }

  let earnedPoints = 0;
  let possiblePoints = 0;

  // Title match (40 points) - only count if user has title preferences
  if (hasTitles) {
    possiblePoints += SCORING_WEIGHTS.TITLE_MATCH;
    earnedPoints += calculateTitleScore(job.title, profile.titles);
  }

  // Keyword match (30 points) - only count if user has keyword preferences
  if (hasKeywords) {
    possiblePoints += SCORING_WEIGHTS.KEYWORD_MATCH;
    const content = buildSearchableContent(job);
    earnedPoints += calculateKeywordScore(content, profile.keywords);
  }

  // Location match (20 points) - only count if user has location preferences
  if (hasLocations && job.location) {
    possiblePoints += SCORING_WEIGHTS.LOCATION_MATCH;
    earnedPoints += calculateLocationScore(job.location, profile.locations);
  }

  // Remote preference match (10 points) - only count if user wants remote only
  if (hasRemotePreference) {
    possiblePoints += SCORING_WEIGHTS.REMOTE_MATCH;
    earnedPoints += calculateRemoteScore(job.remote ?? false, profile.remoteOnly);
  }

  // Calculate percentage score based on preferences actually set
  if (possiblePoints === 0) {
    return 50;
  }

  return Math.round((earnedPoints / possiblePoints) * 100);
}

/**
 * Calculate title match score
 * Awards full points if any profile title is found in the job title
 */
function calculateTitleScore(jobTitle: string, profileTitles: string[]): number {
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
  const contentLower = content.toLowerCase();
  const matchedKeywords = keywords.filter((k) => contentLower.includes(k.toLowerCase()));

  // Award 10 points per keyword, up to max
  const pointsPerKeyword = 10;
  return Math.min(SCORING_WEIGHTS.KEYWORD_MATCH, matchedKeywords.length * pointsPerKeyword);
}

/**
 * Calculate location match score
 * Uses word boundary matching to avoid "US" matching "Austin"
 */
function calculateLocationScore(jobLocation: string, profileLocations: string[]): number {
  for (const loc of profileLocations) {
    if (matchesAsWord(jobLocation, loc)) {
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

/**
 * Score breakdown for a single category
 */
export interface ScoreBreakdownCategory {
  name: string;
  earned: number;
  possible: number;
  percentage: number;
  details: string;
}

/**
 * Full score breakdown
 */
export interface ScoreBreakdown {
  totalScore: number;
  categories: ScoreBreakdownCategory[];
  profilePreferences: {
    titles: string[];
    keywords: string[];
    locations: string[];
    remoteOnly: boolean;
  };
}

/**
 * Calculate match score with detailed breakdown
 */
export function calculateMatchScoreWithBreakdown(
  job: { title: string; description?: string | null; department?: string | null; location?: string | null; remote?: boolean },
  profile: JobProfile | null
): ScoreBreakdown {
  const categories: ScoreBreakdownCategory[] = [];

  // Default profile preferences for display
  const profilePreferences = {
    titles: profile?.titles || [],
    keywords: profile?.keywords || [],
    locations: profile?.locations || [],
    remoteOnly: profile?.remoteOnly || false,
  };

  // If no profile, return neutral score
  if (!profile) {
    return {
      totalScore: 50,
      categories: [{
        name: 'No Profile',
        earned: 50,
        possible: 100,
        percentage: 50,
        details: 'No job profile set - showing neutral score',
      }],
      profilePreferences,
    };
  }

  // Check which preferences the user has actually set
  const hasTitles = profile.titles && profile.titles.length > 0;
  const hasKeywords = profile.keywords && profile.keywords.length > 0;
  const hasLocations = profile.locations && profile.locations.length > 0;
  const hasRemotePreference = profile.remoteOnly === true;

  // If no preferences set at all, return neutral score
  if (!hasTitles && !hasKeywords && !hasLocations && !hasRemotePreference) {
    return {
      totalScore: 50,
      categories: [{
        name: 'No Preferences',
        earned: 50,
        possible: 100,
        percentage: 50,
        details: 'No preferences configured - showing neutral score',
      }],
      profilePreferences,
    };
  }

  let totalEarned = 0;
  let totalPossible = 0;

  // Title match
  if (hasTitles) {
    const titleScore = calculateTitleScore(job.title, profile.titles);
    const titleLower = job.title.toLowerCase();
    const matchedTitles = profile.titles.filter(t => titleLower.includes(t.toLowerCase()));

    totalPossible += SCORING_WEIGHTS.TITLE_MATCH;
    totalEarned += titleScore;

    categories.push({
      name: 'Title Match',
      earned: titleScore,
      possible: SCORING_WEIGHTS.TITLE_MATCH,
      percentage: Math.round((titleScore / SCORING_WEIGHTS.TITLE_MATCH) * 100),
      details: matchedTitles.length > 0
        ? `Matched: ${matchedTitles.join(', ')}`
        : `No match for: ${profile.titles.join(', ')}`,
    });
  }

  // Keyword match
  if (hasKeywords) {
    const content = buildSearchableContent(job);
    const contentLower = content.toLowerCase();
    const keywordScore = calculateKeywordScore(content, profile.keywords);
    const matchedKeywords = profile.keywords.filter(k => contentLower.includes(k.toLowerCase()));

    totalPossible += SCORING_WEIGHTS.KEYWORD_MATCH;
    totalEarned += keywordScore;

    categories.push({
      name: 'Keywords',
      earned: keywordScore,
      possible: SCORING_WEIGHTS.KEYWORD_MATCH,
      percentage: Math.round((keywordScore / SCORING_WEIGHTS.KEYWORD_MATCH) * 100),
      details: matchedKeywords.length > 0
        ? `Found: ${matchedKeywords.join(', ')}`
        : `None found from: ${profile.keywords.join(', ')}`,
    });
  }

  // Location match
  if (hasLocations && job.location) {
    const locationScore = calculateLocationScore(job.location, profile.locations);
    const matchedLocations = profile.locations.filter(l => matchesAsWord(job.location!, l));

    totalPossible += SCORING_WEIGHTS.LOCATION_MATCH;
    totalEarned += locationScore;

    categories.push({
      name: 'Location',
      earned: locationScore,
      possible: SCORING_WEIGHTS.LOCATION_MATCH,
      percentage: Math.round((locationScore / SCORING_WEIGHTS.LOCATION_MATCH) * 100),
      details: matchedLocations.length > 0
        ? `Matched: ${matchedLocations.join(', ')}`
        : `"${job.location}" doesn't match: ${profile.locations.join(', ')}`,
    });
  }

  // Remote preference
  if (hasRemotePreference) {
    const remoteScore = calculateRemoteScore(job.remote ?? false, profile.remoteOnly);

    totalPossible += SCORING_WEIGHTS.REMOTE_MATCH;
    totalEarned += remoteScore;

    categories.push({
      name: 'Remote',
      earned: remoteScore,
      possible: SCORING_WEIGHTS.REMOTE_MATCH,
      percentage: Math.round((remoteScore / SCORING_WEIGHTS.REMOTE_MATCH) * 100),
      details: job.remote ? 'Job is remote ✓' : 'Job is not remote',
    });
  }

  const totalScore = totalPossible > 0
    ? Math.round((totalEarned / totalPossible) * 100)
    : 50;

  return {
    totalScore,
    categories,
    profilePreferences,
  };
}
