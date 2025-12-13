import type { Metadata } from 'next';
import { blogApi } from '@/lib/blog-api';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn more about Tim Callagy and his work in AI.',
};

export default async function AboutPage() {
  let config = null;
  try {
    config = await blogApi.getConfig();
  } catch {
    // Use defaults
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">About</h1>

      <div className="blog-prose max-w-none">
        <figure className="mb-8">
          <img
            src="https://pa-api-6uyh.onrender.com/api/v1/blog/images/1765586456719-de1a33a1f3f6e1ce.jpg"
            alt="Tim Callagy"
            className="rounded-lg w-full max-w-md mx-auto"
          />
          <figcaption className="text-center text-blog-secondary text-sm mt-2 italic">
            Photo taken by my very talented daughter.
          </figcaption>
        </figure>

        <p className="text-lg text-blog-secondary leading-relaxed">
          Welcome to {config?.siteTitle || 'my blog'}! I&apos;m passionate about exploring how artificial
          intelligence can transform the way we learn, work, and create.
        </p>

        <h2>What I Write About</h2>
        <p>
          This blog covers practical applications of AI across various domains:
        </p>
        <ul>
          <li><strong>AI for Learning</strong> - How to leverage AI tools for education and skill development</li>
          <li><strong>AI for Coding</strong> - Using AI assistants and tools to enhance software development</li>
          <li><strong>AI for Marketing</strong> - Applying AI to marketing strategies and content creation</li>
          <li><strong>AI for Branding</strong> - Building and managing brand identity with AI assistance</li>
          <li><strong>AI for Operational Efficiency</strong> - Streamlining business processes with AI</li>
          <li><strong>AI for Innovation</strong> - Exploring cutting-edge AI developments and their implications</li>
          <li><strong>AI for Data Insights</strong> - Using AI for data analysis and decision-making</li>
        </ul>

        <h2>Connect</h2>
        <p>
          I love connecting with readers and fellow AI enthusiasts. Feel free to reach out through
          social media or leave comments on posts.
        </p>

        {config?.socialLinkedIn && (
          <p>
            <a
              href={config.socialLinkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              Connect on LinkedIn
            </a>
          </p>
        )}

        {config?.socialGitHub && (
          <p>
            <a
              href={config.socialGitHub}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              View my projects on GitHub
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
