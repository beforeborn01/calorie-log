import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** 路由切换后滚动条回到顶部。挂在 Router 里即可。 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}
