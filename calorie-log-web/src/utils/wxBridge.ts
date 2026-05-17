// 微信小程序 web-view 桥接层。
//
// 我们的 React web 同时部署在两个地方：
//   1. 浏览器（PC / 微信外的手机浏览器）
//   2. 微信小程序内的 <web-view> 组件
//
// (2) 里 webview 通过 navigator.userAgent 含 "miniProgram"、且 window.__wxjs_environment === 'miniprogram'
// 可以识别。识别后微信会注入 wx.miniProgram 对象，可调用：
//   - wx.miniProgram.navigateTo({ url })
//   - wx.miniProgram.postMessage({ data })   // 数据要等用户分享/后退/组件销毁时才会派发到小程序
//   - wx.miniProgram.getEnv(cb)
//
// 这一层只做**判断 + 安全调用**，不依赖 jweixin-1.6.0.js 的全局加载（那个我们留给小程序工程的页面去加）。
// 在浏览器里这一层都是 no-op，调用方可以无脑调用。

interface WxMiniProgram {
  navigateTo?: (opts: { url: string }) => void;
  navigateBack?: (opts?: { delta?: number }) => void;
  redirectTo?: (opts: { url: string }) => void;
  switchTab?: (opts: { url: string }) => void;
  postMessage?: (opts: { data: unknown }) => void;
  getEnv?: (cb: (res: { miniprogram: boolean }) => void) => void;
  reLaunch?: (opts: { url: string }) => void;
}

interface WxGlobal {
  miniProgram?: WxMiniProgram;
}

declare global {
  interface Window {
    wx?: WxGlobal;
    __wxjs_environment?: string;
  }
}

/** 当前是否运行在微信小程序 web-view 内（同步判断，UA 启发式）。 */
export function isMiniprogram(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.__wxjs_environment === 'miniprogram') return true;
  const ua = navigator.userAgent || '';
  return /miniProgram/i.test(ua);
}

/** 当前是否在微信浏览器（不一定是小程序，可能是公众号 H5）。 */
export function isWeixin(): boolean {
  if (typeof window === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent || '');
}

/**
 * 给小程序外层发消息。仅在小程序内有效；浏览器里是 no-op。
 *
 * 注意：postMessage 不会立刻送达 —— 只有当用户做以下动作之一时小程序才能收到：
 *   - 触发 web-view 的 bindmessage（小程序后退、销毁、分享）
 * 所以不要用它来做实时通信；适合把"会话结束时要带回小程序的数据"打包发出。
 */
export function postToMiniprogram(data: Record<string, unknown>): void {
  if (!isMiniprogram()) return;
  try {
    window.wx?.miniProgram?.postMessage?.({ data });
  } catch (e) {
    console.warn('[wx-bridge] postMessage failed', e);
  }
}

/** 在小程序内跳转到一个原生页面；浏览器里降级为 location.href。 */
export function navigateToNative(path: string, fallbackHref?: string): void {
  if (isMiniprogram()) {
    try {
      window.wx?.miniProgram?.navigateTo?.({ url: path });
      return;
    } catch (e) {
      console.warn('[wx-bridge] navigateTo failed', e);
    }
  }
  if (fallbackHref) window.location.href = fallbackHref;
}

/**
 * 在小程序内 redirectTo 到原生页（不留路由栈）；浏览器里降级为 location.replace。
 * 用于"登出后回到登录页"这种不应该返回的场景。
 */
export function redirectToNative(path: string, fallbackHref?: string): void {
  if (isMiniprogram()) {
    try {
      window.wx?.miniProgram?.redirectTo?.({ url: path });
      return;
    } catch (e) {
      console.warn('[wx-bridge] redirectTo failed', e);
    }
  }
  if (fallbackHref) window.location.replace(fallbackHref);
}

/**
 * 异步精确判断（依赖 jweixin SDK 注入）。
 * 仅在确实需要 SDK 级别确认时使用；多数场景 isMiniprogram() 已足够。
 */
export function getEnv(): Promise<'miniprogram' | 'web'> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve('web');
    const wx = window.wx?.miniProgram;
    if (!wx?.getEnv) return resolve(isMiniprogram() ? 'miniprogram' : 'web');
    wx.getEnv((res) => resolve(res.miniprogram ? 'miniprogram' : 'web'));
  });
}
