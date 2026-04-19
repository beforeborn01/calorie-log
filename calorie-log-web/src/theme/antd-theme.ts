/**
 * Ant Design v6 theme token — 让 Antd 组件融入 Paper & Ink 风格。
 *
 * Usage:
 *   import { ConfigProvider } from 'antd';
 *   import { antdTheme } from '@/theme/antd-theme';
 *   <ConfigProvider theme={antdTheme}>...</ConfigProvider>
 *
 * 策略：Antd 只接管深度表单/Modal/Select/Notification 等密集交互场景。
 * 按钮、卡片、Tag、Progress 全部改用 @/components/sketch 自家实现。
 */

import type { ThemeConfig } from 'antd';

// 原始 token（与 tokens.css 一致，便于 TS 直接引用）
export const tokens = {
  paper:      '#faf7f1',
  paper2:     '#f2ede1',
  paper3:     '#e9e3d2',
  ink:        '#1f1d1a',
  inkSoft:    '#544f46',
  inkFaint:   '#9a9285',
  line:       '#2a2520',

  accent:     '#cf6b2c',  // oklch(0.68 0.16 45) hex fallback
  accentDeep: '#a8521f',
  accentSoft: '#f6e6d6',

  protein:    '#4fa9a5',  // oklch(0.65 0.13 195)
  carb:       '#c7a54f',
  fat:        '#d88d72',

  rSm: 6,  rMd: 10, rLg: 18,
  shadowPaper:  '3px 4px 0 rgba(0,0,0,0.08)',
  shadowRaised: '5px 6px 0 rgba(0,0,0,0.12)',
} as const;

export const antdTheme: ThemeConfig = {
  token: {
    // colors
    colorPrimary:      tokens.accent,
    colorPrimaryHover: tokens.accentDeep,
    colorInfo:         tokens.protein,
    colorSuccess:      tokens.protein,
    colorWarning:      tokens.carb,
    colorError:        tokens.accentDeep,    // soften red → deep orange
    colorBgBase:       tokens.paper,
    colorBgContainer:  tokens.paper,
    colorBgElevated:   tokens.paper,
    colorBgLayout:     tokens.paper,
    colorBorder:       tokens.line,
    colorBorderSecondary: 'rgba(31,29,26,0.14)',
    colorText:         tokens.ink,
    colorTextSecondary:tokens.inkSoft,
    colorTextTertiary: tokens.inkFaint,

    // type
    fontFamily:
      "'Kalam', 'Noto Sans SC', 'PingFang SC', system-ui, sans-serif",
    fontFamilyCode:
      "'JetBrains Mono', monospace",
    fontSize: 15,

    // radius
    borderRadius:   tokens.rMd,
    borderRadiusLG: tokens.rLg,
    borderRadiusSM: tokens.rSm,

    // motion — keep light to avoid slick feel
    motionDurationFast: '80ms',
    motionDurationMid:  '120ms',
    motionDurationSlow: '180ms',

    // shadows
    boxShadow:          tokens.shadowPaper,
    boxShadowSecondary: tokens.shadowRaised,
    boxShadowTertiary:  tokens.shadowPaper,

    // no fancy wireframe mode
    wireframe: false,
  },

  components: {
    Button: {
      defaultBg:          tokens.paper,
      defaultColor:       tokens.ink,
      defaultBorderColor: tokens.ink,
      primaryShadow:      'none',
      borderColorDisabled: 'rgba(31,29,26,0.2)',
      controlHeight:      40,
      controlHeightLG:    48,
      controlHeightSM:    32,
    },
    Input: {
      activeBg:         tokens.paper,
      hoverBorderColor: tokens.accent,
      activeBorderColor:tokens.accent,
      activeShadow:     'none',
      paddingBlock:     10,
    },
    Modal: {
      contentBg: tokens.paper,
      headerBg:  tokens.paper,
      titleColor:tokens.ink,
    },
    Drawer: {
      colorBgElevated: tokens.paper,
    },
    Segmented: {
      itemSelectedBg:    tokens.accentSoft,
      itemSelectedColor: tokens.ink,
      itemColor:         tokens.inkSoft,
      trackBg:           tokens.paper2,
    },
    Tabs: {
      inkBarColor:         tokens.accent,
      itemSelectedColor:   tokens.ink,
      itemActiveColor:     tokens.ink,
      itemHoverColor:      tokens.ink,
      titleFontSize:       15,
    },
    Select: {
      optionSelectedBg:    tokens.accentSoft,
      optionSelectedColor: tokens.ink,
    },
    DatePicker: {
      activeBorderColor: tokens.accent,
      cellActiveWithRangeBg: tokens.accentSoft,
    },
    Notification: {
      colorBgElevated: tokens.paper,
    },
    Message: {
      colorBgElevated: tokens.paper,
    },
    Table: {
      headerBg:        tokens.paper2,
      headerColor:     tokens.inkSoft,
      rowHoverBg:      'rgba(207,107,44,0.06)',
      borderColor:     'rgba(31,29,26,0.12)',
    },
    Dropdown: {
      colorBgElevated: tokens.paper,
    },
    Popover: {
      colorBgElevated: tokens.paper,
    },
    Tooltip: {
      colorBgSpotlight: tokens.ink,
    },
  },
};
