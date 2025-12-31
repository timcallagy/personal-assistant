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
 * Calculate position-based score using linear decay with floor
 * Formula: maxPoints × max(0.25, 1 - (position-1) / count)
 * @param position 0-based position in the preference list
 * @param count Total number of items in the preference list
 * @param maxPoints Maximum points for this category
 */
function calculatePositionScore(position: number, count: number, maxPoints: number): number {
  if (count <= 1) return maxPoints;
  const decayFactor = Math.max(0.25, 1 - position / (count - 1 || 1));
  return Math.round(maxPoints * decayFactor);
}

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
 * Calculate title match score using position-based weighting
 * Earlier items in the profile list score higher
 * Takes the best (highest position) match if multiple titles match
 */
function calculateTitleScore(jobTitle: string, profileTitles: string[]): number {
  const titleLower = jobTitle.toLowerCase();
  const count = profileTitles.length;
  let bestScore = 0;

  // Check for exact substring matches (full position-based score)
  for (let i = 0; i < profileTitles.length; i++) {
    const profileTitle = profileTitles[i]!;
    if (titleLower.includes(profileTitle.toLowerCase())) {
      const score = calculatePositionScore(i, count, SCORING_WEIGHTS.TITLE_MATCH);
      bestScore = Math.max(bestScore, score);
    }
  }

  if (bestScore > 0) return bestScore;

  // Partial match - check for overlapping words (reduced score)
  const jobWords = new Set(titleLower.split(/\s+/).filter((w) => w.length > 2));
  for (let i = 0; i < profileTitles.length; i++) {
    const profileTitle = profileTitles[i]!;
    const titleWords = profileTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const matchingWords = titleWords.filter((w) => jobWords.has(w));
    if (matchingWords.length > 0) {
      // Position-based score multiplied by word overlap ratio
      const positionScore = calculatePositionScore(i, count, SCORING_WEIGHTS.TITLE_MATCH);
      const overlapRatio = matchingWords.length / titleWords.length;
      const score = Math.floor(positionScore * overlapRatio);
      bestScore = Math.max(bestScore, score);
    }
  }

  return bestScore;
}

/**
 * Calculate keyword match score using position-based weighting
 * Earlier keywords in the list contribute more points
 * Sum of matched keyword scores, capped at max
 */
function calculateKeywordScore(content: string, keywords: string[]): number {
  const contentLower = content.toLowerCase();
  const count = keywords.length;
  let totalScore = 0;

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i]!;
    if (contentLower.includes(keyword.toLowerCase())) {
      // Each keyword can contribute up to 10 points, scaled by position
      const keywordMaxPoints = 10;
      totalScore += calculatePositionScore(i, count, keywordMaxPoints);
    }
  }

  return Math.min(SCORING_WEIGHTS.KEYWORD_MATCH, totalScore);
}

/**
 * Calculate location match score using position-based weighting
 * Earlier locations in the list score higher
 * Takes the best (highest position) match if multiple locations match
 */
function calculateLocationScore(jobLocation: string, profileLocations: string[]): number {
  const count = profileLocations.length;
  let bestScore = 0;

  for (let i = 0; i < profileLocations.length; i++) {
    const location = profileLocations[i]!;
    if (matchesAsWord(jobLocation, location)) {
      const score = calculatePositionScore(i, count, SCORING_WEIGHTS.LOCATION_MATCH);
      bestScore = Math.max(bestScore, score);
    }
  }

  return bestScore;
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
    const jobWords = new Set(titleLower.split(/\s+/).filter((w) => w.length > 2));

    // Check for exact substring matches first
    const exactMatches = profile.titles
      .map((t, i) => ({ title: t, position: i + 1 }))
      .filter(({ title }) => titleLower.includes(title.toLowerCase()));

    // If no exact match, check for partial word overlap (same logic as calculateTitleScore)
    let partialMatches: { title: string; position: number; matchingWords: string[] }[] = [];
    if (exactMatches.length === 0) {
      partialMatches = profile.titles
        .map((t, i) => {
          const titleWords = t.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
          const matchingWords = titleWords.filter((w) => jobWords.has(w));
          return { title: t, position: i + 1, matchingWords };
        })
        .filter((m) => m.matchingWords.length > 0);
    }

    totalPossible += SCORING_WEIGHTS.TITLE_MATCH;
    totalEarned += titleScore;

    let details: string;
    if (exactMatches.length > 0) {
      const best = exactMatches[0]!;
      details = `Matched: "${best.title}" (#${best.position} priority)`;
    } else if (partialMatches.length > 0) {
      const best = partialMatches[0]!;
      details = `Partial match: "${best.title}" (#${best.position}) via words: ${best.matchingWords.join(', ')}`;
    } else {
      details = `No match for: ${profile.titles.slice(0, 3).join(', ')}${profile.titles.length > 3 ? '...' : ''}`;
    }

    categories.push({
      name: 'Title Match',
      earned: titleScore,
      possible: SCORING_WEIGHTS.TITLE_MATCH,
      percentage: Math.round((titleScore / SCORING_WEIGHTS.TITLE_MATCH) * 100),
      details,
    });
  }

  // Keyword match
  if (hasKeywords) {
    const content = buildSearchableContent(job);
    const contentLower = content.toLowerCase();
    const keywordScore = calculateKeywordScore(content, profile.keywords);
    const matchedWithPositions = profile.keywords
      .map((k, i) => ({ keyword: k, position: i + 1 }))
      .filter(({ keyword }) => contentLower.includes(keyword.toLowerCase()));

    totalPossible += SCORING_WEIGHTS.KEYWORD_MATCH;
    totalEarned += keywordScore;

    let details: string;
    if (matchedWithPositions.length > 0) {
      const matched = matchedWithPositions.slice(0, 3).map(m => `${m.keyword} (#${m.position})`);
      details = `Found: ${matched.join(', ')}${matchedWithPositions.length > 3 ? '...' : ''}`;
    } else {
      details = `None found from: ${profile.keywords.slice(0, 3).join(', ')}${profile.keywords.length > 3 ? '...' : ''}`;
    }

    categories.push({
      name: 'Keywords',
      earned: keywordScore,
      possible: SCORING_WEIGHTS.KEYWORD_MATCH,
      percentage: Math.round((keywordScore / SCORING_WEIGHTS.KEYWORD_MATCH) * 100),
      details,
    });
  }

  // Location match
  if (hasLocations && job.location) {
    const locationScore = calculateLocationScore(job.location, profile.locations);
    const matchedWithPositions = profile.locations
      .map((l, i) => ({ location: l, position: i + 1 }))
      .filter(({ location }) => matchesAsWord(job.location!, location));

    totalPossible += SCORING_WEIGHTS.LOCATION_MATCH;
    totalEarned += locationScore;

    let details: string;
    if (matchedWithPositions.length > 0) {
      const best = matchedWithPositions[0]!;
      details = `Matched: "${best.location}" (#${best.position} priority)`;
    } else {
      details = `"${job.location}" doesn't match: ${profile.locations.slice(0, 3).join(', ')}${profile.locations.length > 3 ? '...' : ''}`;
    }

    categories.push({
      name: 'Location',
      earned: locationScore,
      possible: SCORING_WEIGHTS.LOCATION_MATCH,
      percentage: Math.round((locationScore / SCORING_WEIGHTS.LOCATION_MATCH) * 100),
      details,
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
