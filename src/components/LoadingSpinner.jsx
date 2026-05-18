export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-club-primary"></div>
        <p className="mt-4 text-text-tertiary">Loading...</p>
      </div>
    </div>
  )
}