import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

const short = (d) => (typeof d === 'string' && d.length >= 10 ? d.slice(5) : d);

export function ChartCard({ title, subtitle, children, height = 240 }) {
  return (
    <div className="card">
      <div className="card-head"><h3>{title}</h3>{subtitle ? <span className="muted small">{subtitle}</span> : null}</div>
      <div style={{ height, padding: '12px 8px 4px' }}>{children}</div>
    </div>
  );
}

/** series: [{ key, name, color }]; data: [{ date, ...keys }] */
export function TimeSeries({ data, series, type = 'line', format }) {
  if (!data?.length) return <div className="empty">No data for this range</div>;
  const Chart = type === 'bar' ? BarChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Chart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#eef1f0" vertical={false} />
        <XAxis dataKey="date" tickFormatter={short} tick={{ fontSize: 11 }} stroke="#aab4b0" />
        <YAxis tick={{ fontSize: 11 }} stroke="#aab4b0" width={48} tickFormatter={format} allowDecimals={false} />
        <Tooltip formatter={(v) => (format ? format(v) : v)} labelFormatter={short} />
        {series.length > 1 ? <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /> : null}
        {series.map((s) => type === 'bar'
          ? <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} stackId={s.stack} />
          : <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} type="monotone" />)}
      </Chart>
    </ResponsiveContainer>
  );
}
