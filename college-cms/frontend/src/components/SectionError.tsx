/** An embedded section failure must not replace the page title or its h1. */
export default function SectionError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return <div className="state-card error" role="alert"><p>{label} are unavailable right now.</p><button type="button" className="btn" onClick={onRetry}>Try again</button></div>
}
