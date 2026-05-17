import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'
import { isMiniprogram } from './utils/wxBridge'
import { tokenStore } from './api/client'

// 让 CSS 能针对小程序 web-view 微调（如隐藏返回按钮、底部安全区）
if (isMiniprogram()) {
  document.documentElement.classList.add('in-miniprogram')
}

// 小程序壳通过 URL 参数把 token 注入进来（一键登录后 redirectTo 带过来）
// 读完立刻 replaceState 清掉，避免被分享出去或留在 history
;(() => {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const refresh = params.get('refresh')
  if (!token || !refresh) return
  tokenStore.set(token)
  tokenStore.setRefresh(refresh)
  // needBindPhone 软提醒标记落到 sessionStorage（HomePage 等会读它决定是否展示横幅）
  if (params.get('needBindPhone') === '1') {
    sessionStorage.setItem('clog_need_bind_phone', '1')
  }
  // 把注入用的 key 全部摘掉，保留其他业务 query
  ;['token', 'refresh', 'needBindPhone', '_ts'].forEach((k) => params.delete(k))
  const qs = params.toString()
  const newUrl = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash
  window.history.replaceState(null, '', newUrl)
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
