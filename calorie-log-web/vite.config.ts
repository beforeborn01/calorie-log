import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react-router') || id.includes('/react-dom/') || /\/react\/[^/]/.test(id)) {
            return 'react-vendor';
          }
          if (id.includes('/antd/') || id.includes('/@ant-design/')) return 'antd';
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'charts';
          if (id.includes('/dayjs/') || id.includes('/axios/') || id.includes('/zustand/')) {
            return 'utils';
          }
          return undefined;
        },
      },
    },
  },
});
