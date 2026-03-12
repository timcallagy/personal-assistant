import * as fs from 'fs';
import * as path from 'path';
import type { EmailTemplate } from './types.js';

export type { EmailTemplate };

export function getTemplate(emailType: string, languageCode: string): EmailTemplate {
  const langPath = path.join(__dirname, languageCode, `${emailType}.json`);
  const fallbackPath = path.join(__dirname, 'en', `${emailType}.json`);

  const filePath = fs.existsSync(langPath) ? langPath : fallbackPath;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Email template not found: ${emailType} (lang: ${languageCode})`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as EmailTemplate;
}

export function renderTemplate(
  template: EmailTemplate,
  vars: { name: string; targetLanguage: string }
): EmailTemplate {
  const replace = (str: string) =>
    str
      .replace(/\{\{name\}\}/g, vars.name)
      .replace(/\{\{targetLanguage\}\}/g, vars.targetLanguage);

  return {
    emailType: template.emailType,
    subject: replace(template.subject),
    text: replace(template.text),
  };
}
