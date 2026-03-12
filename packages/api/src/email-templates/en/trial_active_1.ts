import type { EmailTemplate } from '../types.js';

export const template: EmailTemplate = {
  emailType: 'trial_active_1',
  subject: "Getting the most out of Babblo",
  text: `Hi {{name}},

Hope your first call went well!

A quick tip: calls work best when you pick a specific topic. Instead of just "have a conversation", try something like "help me practise ordering food at a restaurant" or "talk me through introducing myself at a job interview". The more specific the topic, the more useful the call.

Also worth knowing: after every call, Babblo shows you the words and phrases you got wrong and how to say them properly. It's worth spending a minute reviewing these after each session.

One more thing: you can earn extra free minutes by leaving a review on the App Store or Play Store, or by referring a friend. Head to the app settings to get started.

Tim
support@babblo.app`,
};
