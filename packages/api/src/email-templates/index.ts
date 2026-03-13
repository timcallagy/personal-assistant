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

const BANNER_URL = 'https://pa-api-2fwl.onrender.com/api/v1/blog/images/1773416942278-4ed4eb5539547114.webp';

function textToHtml(text: string): string {
  return text
    .split('\n\n')
    .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function buildHtml(bodyText: string, unsubscribeLink: string): string {
  const bodyHtml = textToHtml(bodyText);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin: 0; padding: 0; background: #f5f5f5; font-family: Arial, sans-serif; }
  .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
  .body { padding: 32px 32px 16px; color: #222222; font-size: 15px; line-height: 1.6; }
  .body p { margin: 0 0 16px; }
  .footer { padding: 16px 32px 24px; }
  .footer img { width: 100%; display: block; }
  .unsubscribe { padding: 0 32px 24px; font-size: 11px; color: #999999; text-align: center; }
  .unsubscribe a { color: #999999; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="body">
    ${bodyHtml}
  </div>
  <div class="footer">
    <img src="${BANNER_URL}" alt="Babblo — Master languages through conversation">
  </div>
  <div class="unsubscribe">
    <a href="${unsubscribeLink}">Unsubscribe</a>
  </div>
</div>
</body>
</html>`;
}

export function renderTemplate(
  template: EmailTemplate,
  vars: { name: string; targetLanguage: string; unsubscribeLink: string }
): EmailTemplate {
  const replace = (str: string) =>
    str
      .replace(/\{\{name\}\}/g, vars.name)
      .replace(/\{\{targetLanguage\}\}/g, vars.targetLanguage);

  const bodyText = replace(template.text);

  return {
    emailType: template.emailType,
    subject: replace(template.subject),
    text: bodyText + `\n\n---\nUnsubscribe: ${vars.unsubscribeLink}`,
    html: buildHtml(bodyText, vars.unsubscribeLink),
  };
}
