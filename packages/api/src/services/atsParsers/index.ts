/**
 * ATS Parser Factory
 * Provides the appropriate parser for each ATS type
 */

import { greenhouseParser } from './greenhouse.js';
import { leverParser } from './lever.js';
import { ashbyParser } from './ashby.js';
import type { AtsParser, ParsedJob, CrawlResult } from './types.js';

export type { AtsParser, ParsedJob, CrawlResult } from './types.js';

/**
 * Map of ATS types to their parsers
 */
const parsers: Record<string, AtsParser> = {
  greenhouse: greenhouseParser,
  lever: leverParser,
  ashby: ashbyParser,
};

/**
 * Get the appropriate parser for an ATS type
 * @param atsType The ATS type (greenhouse, lever, ashby, etc.)
 * @returns The parser or null if not supported
 */
export function getParser(atsType: string | null): AtsParser | null {
  if (!atsType) return null;
  return parsers[atsType.toLowerCase()] || null;
}

/**
 * Check if an ATS type has a supported parser
 * @param atsType The ATS type to check
 * @returns True if the ATS type is supported
 */
export function hasParser(atsType: string | null): boolean {
  if (!atsType) return false;
  return atsType.toLowerCase() in parsers;
}

/**
 * Get all supported ATS types
 * @returns Array of supported ATS type names
 */
export function getSupportedAtsTypes(): string[] {
  return Object.keys(parsers);
}

export { greenhouseParser, leverParser, ashbyParser };
