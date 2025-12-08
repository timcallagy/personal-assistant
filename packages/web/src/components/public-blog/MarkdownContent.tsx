'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Custom link handling for external links
        a: ({ href, children, ...props }) => {
          const isExternal = href?.startsWith('http');
          return (
            <a
              href={href}
              {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              {...props}
            >
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
