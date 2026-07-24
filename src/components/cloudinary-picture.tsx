import React from 'react'
import { cn } from '@/lib/utils'

interface CloudinaryPictureProps {
  src: string // This is the public ID (e.g., "assets/images/foo")
  alt: string
  width?: number
  height?: number
  sizes?: string
  breakpoints: number[] | undefined
  className?: string
  pictureClass?: string
}

export function CloudinaryPicture({
  src,
  alt,
  width,
  height,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  breakpoints,
  className,
  pictureClass,
}: CloudinaryPictureProps) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  if (!cloudName) {
    console.error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not defined')
    return null
  }

  if (!breakpoints || breakpoints.length === 0) {
    // Fallback to a simple image if no breakpoints are available
    return (
      <img
        src={`https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${src}`}
        alt={alt}
        width={width}
        height={height}
        className={cn('w-full h-auto', className)}
      />
    )
  }

  const generateSrcSet = (format: string) => {
    return breakpoints
      .map((w) => `https://res.cloudinary.com/${cloudName}/image/upload/f_${format},w_${w}/${src}`)
      .join(', ')
  }

  // The "floor" image uses WebP and the largest breakpoint for the src, or a generic auto
  const fallbackSrc = `https://res.cloudinary.com/${cloudName}/image/upload/f_webp,w_${breakpoints[breakpoints.length - 1]}/${src}`

  return (
    <picture className={cn('block w-full h-auto', pictureClass)}>
      <source type="image/jxl" srcSet={generateSrcSet('jxl')} sizes={sizes} />
      <source type="image/avif" srcSet={generateSrcSet('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={generateSrcSet('webp')} sizes={sizes} />
      <img
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className={cn('w-full h-auto object-cover', className)}
      />
    </picture>
  )
}
