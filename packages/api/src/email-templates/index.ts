import * as fs from 'fs';
import * as path from 'path';
import type { EmailTemplate } from './types.js';

export type { EmailTemplate };

// Localized names for each target language, keyed by [targetLang][emailLang]
const LANGUAGE_NAMES: Record<string, Record<string, string>> = {
  en: { en: 'English', fr: 'anglais', es: 'inglés', de: 'Englisch', it: 'inglese', pt: 'inglês', nl: 'Engels', ru: 'английский', ja: '英語', zh: '英语', ko: '영어', ar: 'الإنجليزية', el: 'Αγγλικά', hi: 'अंग्रेज़ी' },
  fr: { en: 'French', fr: 'français', es: 'francés', de: 'Französisch', it: 'francese', pt: 'francês', nl: 'Frans', ru: 'французский', ja: 'フランス語', zh: '法语', ko: '프랑스어', ar: 'الفرنسية', el: 'Γαλλικά', hi: 'फ्रेंच' },
  es: { en: 'Spanish', fr: 'espagnol', es: 'español', de: 'Spanisch', it: 'spagnolo', pt: 'espanhol', nl: 'Spaans', ru: 'испанский', ja: 'スペイン語', zh: '西班牙语', ko: '스페인어', ar: 'الإسبانية', el: 'Ισπανικά', hi: 'स्पेनिश' },
  de: { en: 'German', fr: 'allemand', es: 'alemán', de: 'Deutsch', it: 'tedesco', pt: 'alemão', nl: 'Duits', ru: 'немецкий', ja: 'ドイツ語', zh: '德语', ko: '독일어', ar: 'الألمانية', el: 'Γερμανικά', hi: 'जर्मन' },
  it: { en: 'Italian', fr: 'italien', es: 'italiano', de: 'Italienisch', it: 'italiano', pt: 'italiano', nl: 'Italiaans', ru: 'итальянский', ja: 'イタリア語', zh: '意大利语', ko: '이탈리아어', ar: 'الإيطالية', el: 'Ιταλικά', hi: 'इतालवी' },
  pt: { en: 'Portuguese', fr: 'portugais', es: 'portugués', de: 'Portugiesisch', it: 'portoghese', pt: 'português', nl: 'Portugees', ru: 'португальский', ja: 'ポルトガル語', zh: '葡萄牙语', ko: '포르투갈어', ar: 'البرتغالية', el: 'Πορτογαλικά', hi: 'पुर्तगाली' },
  nl: { en: 'Dutch', fr: 'néerlandais', es: 'neerlandés', de: 'Niederländisch', it: 'olandese', pt: 'holandês', nl: 'Nederlands', ru: 'нидерландский', ja: 'オランダ語', zh: '荷兰语', ko: '네덜란드어', ar: 'الهولندية', el: 'Ολλανδικά', hi: 'डच' },
  ru: { en: 'Russian', fr: 'russe', es: 'ruso', de: 'Russisch', it: 'russo', pt: 'russo', nl: 'Russisch', ru: 'русский', ja: 'ロシア語', zh: '俄语', ko: '러시아어', ar: 'الروسية', el: 'Ρωσικά', hi: 'रूसी' },
  ja: { en: 'Japanese', fr: 'japonais', es: 'japonés', de: 'Japanisch', it: 'giapponese', pt: 'japonês', nl: 'Japans', ru: 'японский', ja: '日本語', zh: '日语', ko: '일본어', ar: 'اليابانية', el: 'Ιαπωνικά', hi: 'जापानी' },
  zh: { en: 'Chinese', fr: 'chinois', es: 'chino', de: 'Chinesisch', it: 'cinese', pt: 'chinês', nl: 'Chinees', ru: 'китайский', ja: '中国語', zh: '中文', ko: '중국어', ar: 'الصينية', el: 'Κινεζικά', hi: 'चीनी' },
  ko: { en: 'Korean', fr: 'coréen', es: 'coreano', de: 'Koreanisch', it: 'coreano', pt: 'coreano', nl: 'Koreaans', ru: 'корейский', ja: '韓国語', zh: '韩语', ko: '한국어', ar: 'الكورية', el: 'Κορεατικά', hi: 'कोरियाई' },
  ar: { en: 'Arabic', fr: 'arabe', es: 'árabe', de: 'Arabisch', it: 'arabo', pt: 'árabe', nl: 'Arabisch', ru: 'арабский', ja: 'アラビア語', zh: '阿拉伯语', ko: '아랍어', ar: 'العربية', el: 'Αραβικά', hi: 'अरबी' },
  el: { en: 'Greek', fr: 'grec', es: 'griego', de: 'Griechisch', it: 'greco', pt: 'grego', nl: 'Grieks', ru: 'греческий', ja: 'ギリシャ語', zh: '希腊语', ko: '그리스어', ar: 'اليونانية', el: 'Ελληνικά', hi: 'यूनानी' },
  hi: { en: 'Hindi', fr: 'hindi', es: 'hindi', de: 'Hindi', it: 'hindi', pt: 'hindi', nl: 'Hindi', ru: 'хिंदी', ja: 'ヒンディー語', zh: '印地语', ko: '힌디어', ar: 'الهندية', el: 'Χίντι', hi: 'हिंदी' },
};

export function getLocalizedLanguageName(targetLang: string, emailLang: string): string {
  return LANGUAGE_NAMES[targetLang]?.[emailLang] ?? LANGUAGE_NAMES[targetLang]?.['en'] ?? targetLang;
}

export function getTemplate(emailType: string, languageCode: string): EmailTemplate {
  const langPath = path.join(__dirname, languageCode, `${emailType}.json`);
  const fallbackPath = path.join(__dirname, 'en', `${emailType}.json`);

  const filePath = fs.existsSync(langPath) ? langPath : fallbackPath;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Email template not found: ${emailType} (lang: ${languageCode})`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as EmailTemplate;
}

const BANNER_URL = 'https://mail.babblo.app/api/v1/blog/images/1773416942278-4ed4eb5539547114.webp';

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
  vars: { name: string; targetLanguage: string; emailLanguage: string; unsubscribeLink: string }
): EmailTemplate {
  const localizedTarget = getLocalizedLanguageName(vars.targetLanguage, vars.emailLanguage);
  const replace = (str: string) =>
    str
      .replace(/Hi \{\{name\}\},/g, vars.name ? `Hi ${vars.name},` : 'Hi,')
      .replace(/\{\{name\}\}/g, vars.name)
      .replace(/\{\{targetLanguage\}\}/g, localizedTarget);

  const bodyText = replace(template.text);

  return {
    emailType: template.emailType,
    subject: replace(template.subject),
    text: bodyText + `\n\n---\nUnsubscribe: ${vars.unsubscribeLink}`,
    html: buildHtml(bodyText, vars.unsubscribeLink),
  };
}
