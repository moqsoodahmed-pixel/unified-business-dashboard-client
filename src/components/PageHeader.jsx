export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
      {actions ? <div className="row wrap">{actions}</div> : null}
    </div>
  );
}
