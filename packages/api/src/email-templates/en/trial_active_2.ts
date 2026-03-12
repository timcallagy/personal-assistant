import type { EmailTemplate } from '../types.js';

export const template: EmailTemplate = {
  emailType: 'trial_active_2',
  subject: "A quick question",
  text: `Hi {{name}},

It looks like you haven't had a chance to use Babblo in a while. I'd love to hear what's not working for you.

What would make Babblo more useful? Just reply to this email — I read everything.

As a thank you, I'll add some extra free minutes to your account.

Tim
support@babblo.app`,
};
