/**
 * Build script: translates all English email templates into 10 other languages
 * using the Claude API. Run with: npx tsx src/email-templates/translate.ts
 *
 * Skips files that already exist unless --force is passed.
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { template as tns1 } from './en/trial_not_started_1.js';
import { template as tns2 } from './en/trial_not_started_2.js';
import { template as ta1 } from './en/trial_active_1.js';
import { template as ta2 } from './en/trial_active_2.js';
import { template as te1 } from './en/trial_exhausted_1.js';
import type { EmailTemplate } from './types.js';

const LANGUAGES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  ru: 'Russian',
  tr: 'Turkish',
  ja: 'Japanese',
};

const TEMPLATES: EmailTemplate[] = [tns1, tns2, ta1, ta2, te1];
const FORCE = process.argv.includes('--force');

const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

async function translateTemplate(template: EmailTemplate, langCode: string, langName: string): Promise<EmailTemplate> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Translate the following email subject and body into ${langName}.

Rules:
- Keep {{name}} and {{targetLanguage}} exactly as-is (these are placeholders).
- Do not translate the app name "Babblo".
- Do not translate email addresses (support@babblo.app).
- Keep the tone warm, direct, and personal — signed from "Tim".
- Do not add or remove content.

Respond with ONLY valid JSON in this exact format:
{"subject": "...", "text": "..."}

Subject: ${template.subject}

Body:
${template.text}`,
      },
    ],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const parsed = JSON.parse(raw) as { subject: string; text: string };

  return {
    emailType: template.emailType,
    subject: parsed.subject,
    text: parsed.text,
  };
}

async function main() {
  for (const [langCode, langName] of Object.entries(LANGUAGES)) {
    const langDir = path.join(__dirname, langCode);
    fs.mkdirSync(langDir, { recursive: true });

    for (const template of TEMPLATES) {
      const outPath = path.join(langDir, `${template.emailType}.json`);

      if (fs.existsSync(outPath) && !FORCE) {
        console.log(`  skip  [${langCode}] ${template.emailType}`);
        continue;
      }

      // English: write directly from source without calling Claude
      if (langCode === 'en') {
        fs.writeFileSync(outPath, JSON.stringify(template, null, 2));
        console.log(`  write [${langCode}] ${template.emailType}`);
        continue;
      }

      console.log(`  translate [${langCode}] ${template.emailType}...`);
      try {
        const translated = await translateTemplate(template, langCode, langName);
        fs.writeFileSync(outPath, JSON.stringify(translated, null, 2));
        console.log(`  done  [${langCode}] ${template.emailType}`);
      } catch (err) {
        console.error(`  ERROR [${langCode}] ${template.emailType}:`, err);
      }
    }
  }

  console.log('\nTranslation complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
