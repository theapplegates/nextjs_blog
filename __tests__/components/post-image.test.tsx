import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PostImage } from '@/components/post-image'
import { fireEvent, render, screen } from '@/tests/test-utils'

describe('PostImage', () => {
  it('should render image when src is provided', () => {
    render(<PostImage src="https://example.com/image.jpg" alt="Test image" />)

    const image = screen.getByAltText('Test image')
    expect(image).toBeInTheDocument()
    expect(image.getAttribute('src')).toContain('example.com')
  })

  it('should render placeholder when provided and image not loaded', () => {
    render(<PostImage src="https://example.com/image.jpg" alt="Test image" placeholder="Loading..." />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should not render image when src is invalid', () => {
    const { rerender } = render(<PostImage src={undefined} alt="Test image" />)
    expect(screen.queryByAltText('Test image')).not.toBeInTheDocument()

    rerender(<PostImage src="" alt="Test image" />)
    expect(screen.queryByAltText('Test image')).not.toBeInTheDocument()
  })

  it('should hide placeholder after image loads', async () => {
    render(<PostImage src="https://example.com/image.jpg" alt="Test image" placeholder="Loading..." />)

    const image = screen.getByAltText('Test image')
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    fireEvent.load(image)

    await screen.findByAltText('Test image')
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('should handle image load error', () => {
    render(<PostImage src="https://example.com/broken-image.jpg" alt="Test image" />)

    const image = screen.getByAltText('Test image')
    fireEvent.error(image)

    expect(screen.queryByAltText('Test image')).not.toBeInTheDocument()
  })

  it('should apply custom className to image', () => {
    render(<PostImage src="https://example.com/image.jpg" alt="Test image" className="custom-class" />)

    expect(screen.getByAltText('Test image')).toHaveClass('custom-class')
  })

  it('should conditionally apply hover scale classes', () => {
    const { rerender } = render(<PostImage src="https://example.com/image.jpg" alt="Test image" hoverScale />)
    expect(screen.getByAltText('Test image')).toHaveClass('group-hover:scale-105')

    rerender(<PostImage src="https://example.com/image.jpg" alt="Test image" hoverScale={false} />)
    expect(screen.getByAltText('Test image')).not.toHaveClass('group-hover:scale-105')
  })

  it('should reset loaded state when src changes', () => {
    const { rerender } = render(
      <PostImage src="https://example.com/image1.jpg" alt="Test image" placeholder="Loading..." />,
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    rerender(<PostImage src="https://example.com/image2.jpg" alt="Test image" placeholder="Loading..." />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should pass loading prop to Image component', () => {
    render(<PostImage src="https://example.com/image.jpg" alt="Test image" loading="eager" />)

    expect(screen.getByAltText('Test image')).toHaveAttribute('loading', 'eager')
  })

  it('should use lazy loading by default', () => {
    render(<PostImage src="https://example.com/image.jpg" alt="Test image" />)

    expect(screen.getByAltText('Test image')).toHaveAttribute('loading', 'lazy')
  })

  describe('Cloudinary JXL pipeline', () => {
    // assets/images/Image-1 has generated breakpoints in cloudinary-breakpoints.json
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'paulapplegate-com')
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('should render a jxl/avif/webp <picture> for an image with breakpoints, even when unoptimized', () => {
      const { container } = render(
        <PostImage src="assets/images/Image-1.jpg" alt="Palm tree" unoptimized />,
      )

      const picture = container.querySelector('picture')
      expect(picture).toBeInTheDocument()

      const sources = container.querySelectorAll('source')
      expect([...sources].map((s) => s.getAttribute('type'))).toEqual([
        'image/jxl',
        'image/avif',
        'image/webp',
      ])

      // srcset points at Cloudinary with the right format + a generated width
      const jxl = container.querySelector('source[type="image/jxl"]')
      expect(jxl?.getAttribute('srcset')).toContain(
        'res.cloudinary.com/paulapplegate-com/image/upload/f_jxl,w_',
      )

      // floor <img> is a real webp URL, not the raw markdown src
      expect(screen.getByAltText('Palm tree').getAttribute('src')).toContain('f_webp,w_')
    })

    it('should fall through to next/image when the src has no breakpoints', () => {
      render(<PostImage src="assets/images/unknown.jpg" alt="No breakpoints" unoptimized />)

      const img = screen.getByAltText('No breakpoints')
      expect(img.closest('picture')).toBeNull()
    })
  })
})
