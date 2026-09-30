export function StatCard({ label, value, sub, channel = '', title }) {
  return (
    <div className={`card stat ${channel}`} title={title}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}
