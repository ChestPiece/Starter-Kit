"use client";

import Image, { ImageProps } from 'next/image';
import { useState, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallbackSrc?: string;
  showSkeleton?: boolean;
  skeletonClassName?: string;
  containerClassName?: string;
  onLoadComplete?: () => void;
  onError?: () => void;
}

const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({
    src,
    alt,
    fallbackSrc = '/images/placeholder.svg',
    showSkeleton = true,
    skeletonClassName,
    containerClassName,
    className,
    onLoadComplete,
    onError,
    priority = false,
    quality = 85,
    ...props
  }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(src);

    const handleLoad = () => {
      setIsLoading(false);
      onLoadComplete?.();
    };

    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        setHasError(false);
        setIsLoading(true);
      }
      onError?.();
    };

    return (
      <div className={cn('relative overflow-hidden', containerClassName)}>
        {isLoading && showSkeleton && (
          <Skeleton 
            className={cn(
              'absolute inset-0 z-10',
              skeletonClassName
            )} 
          />
        )}
        
        <Image
          ref={ref}
          src={currentSrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            hasError && 'grayscale',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          priority={priority}
          quality={quality}
          // Optimize loading with modern formats
          placeholder={props.placeholder || 'blur'}
          blurDataURL={props.blurDataURL || 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='}
          {...props}
        />
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

export { OptimizedImage };
export type { OptimizedImageProps };

// Utility function for generating blur data URLs
export function generateBlurDataURL(width: number = 8, height: number = 8): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Create a simple gradient blur effect
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/jpeg', 0.1);
}

// Utility function for responsive image sizing
export function getResponsiveImageSizes(breakpoints?: {
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}): string {
  const defaultBreakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    ...breakpoints
  };
  
  return `
    (max-width: ${defaultBreakpoints.sm}px) 100vw,
    (max-width: ${defaultBreakpoints.md}px) 50vw,
    (max-width: ${defaultBreakpoints.lg}px) 33vw,
    25vw
  `;
}

// Utility for creating optimized image props
export function createOptimizedImageProps({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 85,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
}): Partial<OptimizedImageProps> {
  return {
    src,
    alt,
    width,
    height,
    priority,
    quality,
    sizes: getResponsiveImageSizes(),
    placeholder: 'blur',
    blurDataURL: generateBlurDataURL(),
  };
}