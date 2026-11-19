interface HeroProps {
  onBrowse: () => void
  onSimulate: () => void
  matchCount: number
}

export function Hero({ onBrowse, onSimulate, matchCount }: HeroProps) {
  return (
    <section className="hero" aria-label="JPG LPF hero">
      <div className="hero-pitch" aria-hidden>
        <div className="center-circle" />
      </div>
      <div className="hero-content">
        <h1 className="hero-brand">JPG LPF</h1>
        <p className="hero-line">
          Historical matches and odds across Europe&apos;s top five leagues —
          simulate staking strategies with pitch-side clarity.
        </p>
        <div className="cta-row">
          <button type="button" className="btn btn-primary" onClick={onBrowse}>
            Browse matches
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSimulate}>
            Run a strategy
          </button>
        </div>
        {matchCount > 0 && (
          <p className="muted" style={{ marginTop: '1.1rem', fontSize: '0.85rem' }}>
            {matchCount.toLocaleString()} matches cached locally · offline-ready
          </p>
        )}
      </div>
    </section>
  )
}
