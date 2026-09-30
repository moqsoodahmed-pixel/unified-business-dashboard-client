export function Pagination({ page, pages, total, onPage }) {
  if (!total) return null;
  return (
    <div className="pager">
      <span>{total.toLocaleString('en-IN')} result{total === 1 ? '' : 's'}</span>
      <span className="row">
        <button className="btn sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span className="num">Page {page} of {Math.max(pages, 1)}</span>
        <button className="btn sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </span>
    </div>
  );
}
