export interface EmailTemplate {
  emailType: string;
  subject: string;
  text: string; // Use {{name}} and {{targetLanguage}} as placeholders
  html?: string;
}
