// Eastside FC official shield logo
import eastsideFCLogo from '../assets/eastside-fc-logo.png'

export default function EastsideFCLogo({ size = 48, className }) {
  // Support both size prop and className prop for backward compatibility
  const imgSize = className?.includes('w-16') || className?.includes('h-16') ? 64 : size

  return (
    <img
      src={eastsideFCLogo}
      alt="Eastside FC Washington"
      width={imgSize}
      height={imgSize}
      style={{ objectFit: 'contain' }}
      className={className || 'block'}
    />
  )
}