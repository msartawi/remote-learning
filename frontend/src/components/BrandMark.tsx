type BrandMarkProps = {
  compact?: boolean
}

function BrandMark({ compact }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-400 text-lg font-semibold text-slate-950">
        F
      </div>
      {!compact && (
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">FEMT</p>
          <p className="text-lg font-semibold text-white">Remote Learning</p>
        </div>
      )}
    </div>
  )
}

export default BrandMark
