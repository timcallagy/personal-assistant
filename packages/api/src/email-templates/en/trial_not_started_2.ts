import type { EmailTemplate } from '../types.js';

export const template: EmailTemplate = {
  emailType: 'trial_not_started_2',
  subject: "Quick question about Babblo",
  text: `Hi {{name}},

You signed up for Babblo a few days ago but haven't made a call yet — I'd love to know why.

Is something getting in the way? Just reply to this email and let me know. I read every response.

As a thank you for your feedback, I'll add extra free minutes to your account.

Tim
support@babblo.app`,
};
