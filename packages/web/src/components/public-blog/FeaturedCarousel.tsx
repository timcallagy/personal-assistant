'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { BlogPostSummary } from '@/lib/blog-api';

interface FeaturedCarouselProps {
  posts: BlogPostSummary[];
}

export function FeaturedCarousel({ posts }: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % Math.ceil(posts.length / 2));
  }, [posts.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + Math.ceil(posts.length / 2)) % Math.ceil(posts.length / 2));
  }, [posts.length]);

  // Auto-advance every 5 seconds when not hovered
  useEffect(() => {
    if (isHovered || posts.length <= 2) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [isHovered, nextSlide, posts.length]);

  if (posts.length === 0) return null;

  // Show 2 posts at a time on desktop, 1 on mobile
  const visiblePosts = posts.slice(currentIndex * 2, currentIndex * 2 + 2);
  // Fill with posts from the beginning if we don't have enough
  while (visiblePosts.length < 2 && posts.length > 0) {
    const neededIndex = visiblePosts.length;
    const post = posts[neededIndex % posts.length];
    if (post) visiblePosts.push(post);
    else break;
  }

  const totalSlides = Math.ceil(posts.length / 2);

  return (
    <div
      className="featured-carousel relative mb-8"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col md:flex-row gap-0">
        {visiblePosts.map((post, idx) => (
          <Link
            key={`${post.id}-${idx}`}
            href={`/post/${post.slug}`}
            className="carousel-slide flex-1 relative"
          >
            <div
              className="post-thumbnail-carousel"
              style={{
                backgroundImage: post.featuredImage
                  ? `url("${post.featuredImage}")`
                  : 'linear-gradient(135deg, #5F5849 0%, #3a3530 100%)',
              }}
            >
              <div className="post-thumbnail-overlay">
                <header className="entry-header-carousel">
                  <div className="entry-meta-carousel">
                    <span className="cat-link-carousel">{post.categoryName}</span>
                  </div>
                  <h2 className="entry-title-carousel">{post.title}</h2>
                </header>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Navigation arrows */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prevSlide(); }}
            className="carousel-nav carousel-nav-prev"
            aria-label="Previous slide"
          >
            prev
          </button>
          <button
            onClick={(e) => { e.preventDefault(); nextSlide(); }}
            className="carousel-nav carousel-nav-next"
            aria-label="Next slide"
          >
            next
          </button>
        </>
      )}
    </div>
  );
}
