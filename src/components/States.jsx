export function LoadingState({ label = 'Loading…' }) {
  return <div className="state" role="status"><div className="spinner" /><div>{label}</div></div>;
}
export function ErrorState({ error, onRetry }) {
  return (
    <div className="state" role="alert">
      <h3>Something went wrong</h3>
      <p>{error?.message || 'The request failed.'}</p>
      {onRetry ? <button className="btn" onClick={onRetry}>Try again</button> : null}
    </div>
  );
}
export function EmptyState({ title = 'Nothing here yet', hint, action }) {
  return <div className="empty"><h3>{title}</h3>{hint ? <p>{hint}</p> : null}{action}</div>;
}
/** Renders loading / error / empty / content for a useApi result. */
export function Async({ res, empty, children, isEmpty }) {
  if (res.loading && !res.data) return <LoadingState />;
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />;
  if (!res.data) return null;
  if (isEmpty?.(res.data)) return empty;
  return children(res.data);
}
