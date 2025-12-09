'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState('');

  const handleImageClick = (src: string) => {
    setLightboxImage(src);
    setLightboxOpen(true);
  };

  return (
    <>
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
          // Custom image handling for lightbox
          img: ({ src, alt, ...props }) => {
            if (!src) return null;
            return (
              <img
                src={src}
                alt={alt || ''}
                onClick={() => handleImageClick(src)}
                style={{ cursor: 'pointer' }}
                title="Click to expand"
                {...props}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={[{ src: lightboxImage }]}
      />
    </>
  );
}
