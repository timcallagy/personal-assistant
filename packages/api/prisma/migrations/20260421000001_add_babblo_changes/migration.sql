CREATE TABLE "babblo_changes" (
  "id" SERIAL PRIMARY KEY,
  "date" TEXT NOT NULL,
  "time" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "babblo_changes_date_idx" ON "babblo_changes"("date");

-- Seed existing changes
INSERT INTO "babblo_changes" ("date", "time", "category", "description") VALUES
('2026-03-10', 'morning',   'campaign', 'Removed India and Pakistan from audience targeting'),
('2026-03-11', 'morning',   'app',      'Deployed new app version with onboarding/setup screens before the login screen'),
('2026-03-11', 'afternoon', 'campaign', 'Removed ''Babblo banner (wider)_1.91:1.png'' image asset and YouTube video asset from campaign'),
('2026-03-13', 'morning',   'campaign', 'Switched to allowlist targeting: GB, IE, FR, DE, ES, IT, NL, BE, PT, AT, CH, US, CA, AU, NZ, JP, KR, SG, HK, TW, AE, SA, QA'),
('2026-03-16', 'evening',   'app',      'Removed native language selection screen from onboarding — now inferred from device locale'),
('2026-03-16', 'evening',   'campaign', 'Reverted to all locations (removed allowlist targeting restriction)'),
('2026-03-18', 'evening',   'app',      'Removed Interests selection screen from onboarding'),
('2026-03-23', 'morning',   'campaign', 'Added India, Bangladesh, Nepal and Pakistan to blocklist targeting'),
('2026-03-23', 'afternoon', 'app',      'Added new ''App Opened'' PostHog event firing at app launch before any loading or navigation logic, to provide a true top-of-funnel baseline'),
('2026-03-23', 'afternoon', 'app',      'Moved ''Onboarding Started'' PostHog event to fire as soon as new user is detected (before any screen renders), rather than inside the onboarding screen component'),
('2026-03-23', 'afternoon', 'app',      'Replaced plain black loading screen with branded Babblo logo screen to reduce users closing the app during initialisation on slow devices'),
('2026-03-26', 'afternoon', 'app',      'Removed email account creation (email login retained for existing users); all new signups via Google only'),
('2026-03-26', 'afternoon', 'app',      'Auto-start call at end of onboarding — call begins immediately after account creation instead of requiring user to slide to call'),
('2026-04-03', 'morning',   'app',      'Added Microphone Permission Requested and Microphone Permission Denied PostHog events around getUserMedia()'),
('2026-04-03', 'morning',   'app',      'app_version now automatically merged into every PostHog event via analytics.track()'),
('2026-04-03', 'morning',   'app',      'paywall_viewed now tracks source prop (call_screen, settings_menu, deep_link)'),
('2026-04-03', 'morning',   'app',      'Bug fix: tutorial image oversized in production — capped at SCREEN_HEIGHT * 0.5'),
('2026-04-03', 'morning',   'app',      'Bug fix: flashcard filling screen on cold start — wrapped PanGestureHandler in explicit-dimensioned View to fix Reanimated initialisation issue'),
('2026-04-03', 'morning',   'app',      'Bug fix: black SettingsMenu — Modal renders outside root ErrorBoundary; added ErrorBoundary wrapper inside Modal to surface silent errors'),
('2026-04-04', 'afternoon', 'campaign', 'Google Ads: switched to allowlist targeting (FR, DE, GB, IE, IT, ES, NL, BE, PT, CH, AT, US, CA, AU, NZ, JP, KR, SG, HK, TW, AE, SA, QA); daily budget increased from €10 to €20'),
('2026-04-04', 'afternoon', 'campaign', 'Apple Search Ads Basic campaign created (max CPI €1.27, monthly budget €150); status pending Apple review before going live'),
('2026-04-09', 'evening',   'campaign', 'Google Ads: increased daily budget from €20 to €40 — CPA running at €0.05 vs €0.20 target (4x headroom), campaign flagged as ''Limited by budget soon'''),
('2026-04-16', 'morning',   'app',      'Launched Topics section: users can select a conversation topic before starting a call. Also improved onboarding visuals with 2 new onboarding screens (target language selection + topic for first conversation) shown before the Login screen.'),
('2026-04-17', 'evening',   'campaign', 'Google Ads: raised target CPI from €0.20 to €3.00 and reduced daily budget from €40 to €20 — previous €0.20 target was uncompetitive in western markets, causing near-zero spend'),
('2026-04-17', 'evening',   'app',      'Set up A/B test on paywall pricing — 50% of users see half-price offering');
