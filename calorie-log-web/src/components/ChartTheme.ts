// recharts 主题色，遵循 calorie-log-web/DESIGN.md 单一强调色规则：
// 主线使用 Apple Blue；次要数据使用灰阶；多系列饼图用主蓝单色的 3 级明度。
export const chartTheme = {
  primary: '#0071e3',
  primaryFaded: '#4fa0ef',
  primaryMuted: '#9ac4f4',
  secondary: 'rgba(0, 0, 0, 0.32)',
  grid: 'rgba(0, 0, 0, 0.06)',
  axis: 'rgba(0, 0, 0, 0.48)',
  tooltipBg: 'rgba(255, 255, 255, 0.96)',
  tooltipBorder: 'rgba(0, 0, 0, 0.08)',
};

export const tooltipStyle = {
  background: chartTheme.tooltipBg,
  border: `1px solid ${chartTheme.tooltipBorder}`,
  borderRadius: 10,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 14px rgba(0,0,0,0.06)',
  fontSize: 12,
  color: '#1d1d1f',
};

export const axisStyle = {
  fontSize: 11,
  fill: chartTheme.axis,
  letterSpacing: -0.01,
};
