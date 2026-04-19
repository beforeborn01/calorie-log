# 卡路里 App · 设计系统

> **Paper & Ink** — 一套给健身/增肌人群的卡路里记录 App 设计语言。
> 克制、温暖、像在翻一本手写的训练笔记。

---

## 1. 设计哲学

1. **不施压**。数据不追着用户跑。负面超标不用红色，用柔和的深橙。
2. **蛋白优先**。增肌场景下，蛋白数据永远在视觉层级第一梯队。
3. **手写气质**。所有边框、进度条、环形图使用手绘路径 / 扰动滤镜，区别于千篇一律的扁平化。
4. **数据用等宽**。所有数字、单位、时间戳一律 `JetBrains Mono`，方便扫读。

---

## 2. 颜色 Tokens

全部以 CSS 自定义变量暴露，支持 `:root` 覆盖做主题切换。

| Token           | 值                             | 用途                     |
| --------------- | ------------------------------ | ------------------------ |
| `--paper`       | `#faf7f1`                      | 页面底色（暖白）        |
| `--paper-2`     | `#f2ede1`                      | 卡片/次级底色           |
| `--paper-3`     | `#e9e3d2`                      | 分割/Hover               |
| `--ink`         | `#1f1d1a`                      | 主文字                  |
| `--ink-soft`    | `#544f46`                      | 次级文字                |
| `--ink-faint`   | `#9a9285`                      | 三级文字 / 占位          |
| `--accent`      | `oklch(0.68 0.16 45)`          | 主强调色（暖橙）        |
| `--accent-deep` | `oklch(0.55 0.18 40)`          | Hover / 选中态           |
| `--accent-soft` | `oklch(0.94 0.05 45)`          | 高亮背景 / Chip         |
| `--protein`     | `oklch(0.65 0.13 195)`         | 蛋白质（青）            |
| `--carb`        | `oklch(0.78 0.11 85)`          | 碳水（黄）              |
| `--fat`         | `oklch(0.72 0.12 25)`          | 脂肪（桃）              |

**规则**：
- 三个宏量色共享 `chroma ≈ 0.11-0.13`，通过 `hue` 区分，和谐一致
- **永远不用纯白**（`#fff`）作背景
- **永远不用纯黑**（`#000`）作文字
- 错误/超标不用红，用 `--accent-deep`

---

## 3. 字体

通过 Google Fonts 引入：

```html
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Kalam:wght@400;700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
```

| 用途         | Family                        | Size/Weight          | 类名       |
| ------------ | ----------------------------- | -------------------- | ---------- |
| Display 标题 | `Caveat`                      | 32-56px / 700        | `.display` |
| 正文 / 标题  | `Kalam` + `Noto Sans SC` 回退 | 13-18px / 400 or 700 | `.hand`    |
| 数据 / 数字  | `JetBrains Mono`              | 10-48px / 400-500    | `.mono`    |
| 中文长文     | `Noto Sans SC`                | 13-16px / 400        | `.sans`    |

**规则**：
- 标题用 `Caveat`（手写草体）打破规整感
- 正文永远搭配 `Noto Sans SC` 作为中文回退
- 数据永远 mono，让"1842"和"2950"上下对齐扫读

---

## 4. 圆角 & 阴影

```css
--r-sm: 6px;      /* input, small chip */
--r-md: 10px;     /* button, card */
--r-lg: 18px;     /* modal, sheet */
--r-pill: 999px;  /* tag, pill */

--shadow-paper:  3px 4px 0 rgba(0,0,0,0.08);  /* 卡片 */
--shadow-raised: 5px 6px 0 rgba(0,0,0,0.12);  /* 浮起 */
```

阴影用 **硬偏移** 而非高斯模糊，强化"贴纸/纸本"气质。

---

## 5. 组件清单（在 `handoff/components/`）

| 组件            | 用途                                                       |
| --------------- | ---------------------------------------------------------- |
| `SketchBox`     | 手绘风矩形边框（绝对定位层），其他组件的视觉基础           |
| `SketchCircle`  | 手绘风圆形容器                                             |
| `PaperCard`     | 纸本卡片（含硬阴影 + 手绘边）                              |
| `ScribbleBar`   | 进度条（条纹填充）                                         |
| `RingChart`     | 环形图（用于卡路里总量）                                   |
| `BarChart`      | 简易条形图（周/月报）                                      |
| `SketchButton`  | 主/次按钮                                                  |
| `Pill`          | 切换 Tab / 筛选项                                          |
| `Chip`          | 标签（高蛋白 / 早餐 / ...）                                |
| `Kicker`        | 小号等宽标题（SECTION · TAG）                              |

所有组件：
- 零 runtime 依赖，只依赖 React 18+
- Props 用 TypeScript 显式声明
- 通过 CSS 变量主题化，支持 className 覆盖

---

## 6. 与 Ant Design v6 的整合

Antd 用来承接**交互密集**的部件（表单、Modal、Select、DatePicker、Notification），但视觉改写成纸本气质。

参考 `handoff/antd-theme.ts` 的 token 配置。核心修改：

```ts
{
  token: {
    colorPrimary: '#cf6b2c',          // 橙
    colorBgBase:  '#faf7f1',          // 纸
    colorTextBase:'#1f1d1a',
    fontFamily:   "'Kalam','Noto Sans SC',system-ui,sans-serif",
    borderRadius: 10,
    boxShadow:    '3px 4px 0 rgba(0,0,0,0.08)',
    wireframe:    false,
  },
  components: {
    Button:  { primaryShadow: 'none', defaultBorderColor: '#1f1d1a' },
    Input:   { activeBorderColor: '#cf6b2c' },
    Modal:   { contentBg: '#faf7f1', headerBg: '#faf7f1' },
    Segmented:{ itemSelectedBg: 'oklch(0.94 0.05 45)' },
    // ...
  }
}
```

原则：**Antd 组件降级到底层交互；视觉由我们自己的组件接管。** Button / Card / Tag / Progress 都用自家实现，Antd 版本只在 table / form 这种深度表单场景使用。

---

## 7. 页面适用范围

| 页面                | 关键组件                                   |
| ------------------- | ------------------------------------------ |
| `HomePage`          | RingChart + 3× Macro 卡片 + Meal 列表       |
| `AddFoodPage`       | 搜索 Input + 食物卡片列表 + Pill 切换      |
| `RecognizePage`     | 相机框 + 识别结果 Chip + 置信度 Scribble    |
| `ReportsPage`       | BarChart + Streak 热力图 + 周目标卡片       |
| `GoalSetupPage`     | 数字 Stepper + RingChart 预览               |
| `ProfilePage`       | 成就徽章（PaperCard + SketchCircle）        |

---

## 8. 迁移步骤（给 `calorie-log-web`）

1. 复制 `handoff/tokens.css` → `src/styles/tokens.css`，在入口 `main.tsx` import
2. 复制 `handoff/components/` → `src/components/sketch/`
3. 复制 `handoff/antd-theme.ts` → `src/theme/antd-theme.ts`，在 `App.tsx` 套 `<ConfigProvider theme={antdTheme}>`
4. 页面逐个替换：先 `HomePage` 验证，再推到全局
5. 删除原本使用 `antd` 的 `Card` / `Progress` / `Button` 的文件，改成 `@/components/sketch`

---

## 9. 什么时候**不**用这套风格

- 法律/协议页面：用 Antd 默认朴素样式
- 系统对话框（授权定位、相机等）：尊重 iOS 原生
- 数据导出 / CSV 下载：等宽 + 简单表格即可

---

_v0.1 · 2026-04_
