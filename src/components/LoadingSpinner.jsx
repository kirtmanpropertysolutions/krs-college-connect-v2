export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-club-primary"></div>
        <p className="mt-4 text-gray-400">Loading...</p>
      </div>
    </div>
  )
}