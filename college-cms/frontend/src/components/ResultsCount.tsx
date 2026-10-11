interface ResultsCountProps {
  /** null while loading or on error: the live region stays mounted but is empty */
  count: number | null
  singular?: string
  plural?: string
}

export default function ResultsCount({ count, singular = 'result', plural = 'results' }: ResultsCountProps) {
  const text = count === null ? '' : `Showing ${count} ${count === 1 ? singular : plural}`
  return (
    <p className="results-count" aria-live="polite">
      {text}
    </p>
  )
}
