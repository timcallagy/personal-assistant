import type { EmailTemplate } from '../types.js';

export const template: EmailTemplate = {
  emailType: 'trial_not_started_1',
  subject: "Your first Babblo call is waiting",
  text: `Hi {{name}},

You're all set to start practising {{targetLanguage}} with Babblo — you have 10 free minutes ready to go.

Here's how to get started:
1. Open Babblo
2. Pick an AI conversation partner
3. Hit call and start talking

Your first call doesn't need to be perfect. Just start.

Tim
support@babblo.app`,
};
