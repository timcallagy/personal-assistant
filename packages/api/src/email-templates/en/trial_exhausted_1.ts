import type { EmailTemplate } from '../types.js';

export const template: EmailTemplate = {
  emailType: 'trial_exhausted_1',
  subject: "You've used your free minutes — keep going",
  text: `Hi {{name}},

You've used up your 10 free Babblo minutes — hope the calls were useful!

Your first top-up comes with 50% extra minutes free, automatically applied at checkout.

Open Babblo to top up your account.

Tim
support@babblo.app`,
};
