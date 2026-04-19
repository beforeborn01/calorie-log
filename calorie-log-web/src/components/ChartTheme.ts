// recharts 主题色，对齐 Paper & Ink token：
// 主线 var(--accent) 暖橙（hex #cf6b2c）；次要灰阶；网格虚线。
export const chartTheme = {
  primary: '#cf6b2c',
  primaryFaded: '#d88d72',
  primaryMuted: '#f6e6d6',
  secondary: 'rgba(31, 29, 26, 0.45)',
  grid: 'rgba(31, 29, 26, 0.1)',
  axis: 'rgba(31, 29, 26, 0.55)',
  tooltipBg: '#faf7f1',
  tooltipBorder: 'rgba(31, 29, 26, 0.2)',
};

export const tooltipStyle = {
  background: chartTheme.tooltipBg,
  border: `1.5px dashed ${chartTheme.tooltipBorder}`,
  borderRadius: 10,
  boxShadow: '3px 4px 0 rgba(0,0,0,0.08)',
  fontSize: 12,
  color: '#1f1d1a',
  fontFamily: 'Kalam, sans-serif',
};

export const axisStyle = {
  fontSize: 11,
  fill: chartTheme.axis,
  fontFamily: 'JetBrains Mono, monospace',
};
