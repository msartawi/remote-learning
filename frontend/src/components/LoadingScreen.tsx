type LoadingScreenProps = {
  message?: string
}

function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="glass-panel flex flex-col items-center gap-4 px-8 py-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-400" />
        <p className="text-sm text-slate-300">{message}</p>
      </div>
    </div>
  )
}

export default LoadingScreen
