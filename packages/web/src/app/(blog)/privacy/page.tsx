import type { Metadata } from 'next';
import { blogApi } from '@/lib/blog-api';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Our privacy policy and how we handle your data.',
};

export default async function PrivacyPage() {
  let config = null;
  try {
    config = await blogApi.getConfig();
  } catch {
    // Use defaults
  }

  const siteTitle = config?.siteTitle || 'Tim Callagy';

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="blog-prose max-w-none">
        <p className="text-blog-muted">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <h2>Overview</h2>
        <p>
          This privacy policy explains how {siteTitle} (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) collects,
          uses, and protects your personal information when you visit our website.
        </p>

        <h2>Information We Collect</h2>

        <h3>Newsletter Subscription</h3>
        <p>
          When you subscribe to our newsletter, we collect:
        </p>
        <ul>
          <li>Your email address</li>
          <li>Your IP address (for consent records)</li>
          <li>The date and time of your subscription</li>
          <li>The specific consent text you agreed to</li>
        </ul>
        <p>
          This information is collected only with your explicit consent and is used solely
          for sending you newsletter emails about AI-related topics.
        </p>

        <h3>Analytics</h3>
        <p>
          We may collect anonymous usage data such as page views and reading patterns to
          improve our content. This data does not personally identify you.
        </p>

        <h2>How We Use Your Information</h2>
        <ul>
          <li>To send newsletter emails (only if you&apos;ve subscribed)</li>
          <li>To improve our website and content</li>
          <li>To respond to your inquiries</li>
        </ul>

        <h2>Your Rights (GDPR)</h2>
        <p>
          If you are in the European Economic Area (EEA), you have certain data protection rights:
        </p>
        <ul>
          <li><strong>Right to Access</strong> - You can request a copy of your personal data</li>
          <li><strong>Right to Rectification</strong> - You can request correction of inaccurate data</li>
          <li><strong>Right to Erasure</strong> - You can request deletion of your personal data</li>
          <li><strong>Right to Withdraw Consent</strong> - You can unsubscribe from the newsletter at any time</li>
        </ul>

        <h2>Unsubscribing</h2>
        <p>
          You can unsubscribe from our newsletter at any time by clicking the unsubscribe
          link in any email, or by contacting us directly.
        </p>

        <h2>Data Retention</h2>
        <p>
          We retain newsletter subscription data for as long as you remain subscribed.
          Upon unsubscribing, your data will be marked as unsubscribed but retained for
          compliance purposes. You may request complete deletion at any time.
        </p>

        <h2>Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your
          personal data against unauthorized access, alteration, disclosure, or destruction.
        </p>

        <h2>Third-Party Services</h2>
        <p>
          We do not sell or share your personal information with third parties for their
          marketing purposes. We may use third-party services (such as hosting providers)
          that process data on our behalf.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this privacy policy or want to exercise your rights,
          please contact us through the social links provided on our website.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify subscribers
          of significant changes via email.
        </p>
      </div>
    </div>
  );
}
