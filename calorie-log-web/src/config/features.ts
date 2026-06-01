/**
 * 上线开关。重开条件写在 docs/launch-checklist.md。
 *
 * 这里只控菜单显隐；路由（App.tsx）一律保留，方便灰度时直接打开内链。
 */
export const FEATURES = {
  // 拍照识别。依赖 BAIDU_AI_API_KEY / BAIDU_AI_SECRET_KEY。
  // 未配置时后端走 MockFoodRecognitionService，返回写死候选，会破坏用户信任。
  aiRecognize: false,

  // 烹饪推荐。依赖 LLM (豆包) 配置。
  // 未配置时后端走 MockCookingSuggestionService，按食材类别匹配静态库。
  aiCooking: false,

  // 烹饪收藏。本身可用，但唯一入口是 /cooking，单留会变成永远空的页面。
  aiFavorites: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;
