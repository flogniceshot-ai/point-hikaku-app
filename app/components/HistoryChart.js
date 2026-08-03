function formatDate(d) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function HistoryChart({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="chart-wrap">
        <div className="chart-empty">この案件の還元額推移データはまだありません。</div>
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 28, left: 48 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const values = history.map((h) => h.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const points = history.map((h, i) => {
    const x = padding.left + (history.length === 1 ? plotW / 2 : (i / (history.length - 1)) * plotW);
    const y = padding.top + plotH - ((h.value - minV) / range) * plotH;
    return { x, y, ...h };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="還元額の推移グラフ">
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#e5e7eb"
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#e5e7eb"
        />
        <text x={4} y={padding.top + 4} fontSize="11" fill="#9ca3af">
          {maxV.toLocaleString()}
        </text>
        <text x={4} y={height - padding.bottom} fontSize="11" fill="#9ca3af">
          {minV.toLocaleString()}
        </text>
        <path d={linePath} fill="none" stroke="#ff6f61" strokeWidth="2.5" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#ff6f61" />
        ))}
        <text x={points[0].x} y={height - 8} fontSize="11" fill="#9ca3af" textAnchor="start">
          {formatDate(points[0].date)}
        </text>
        <text
          x={points[points.length - 1].x}
          y={height - 8}
          fontSize="11"
          fill="#9ca3af"
          textAnchor="end"
        >
          {formatDate(points[points.length - 1].date)}
        </text>
      </svg>
    </div>
  );
}
