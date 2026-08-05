import { fileURLToPath, URL } from 'node:url'

import { TDesignResolver } from '@tdesign-vue-next/auto-import-resolver'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import svgLoader from 'vite-svg-loader'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      dts: 'src/auto-imports.d.ts',
      resolvers: [TDesignResolver({ library: 'vue-next' })],
    }),
    Components({
      dts: 'src/components.d.ts',
      resolvers: [TDesignResolver({ library: 'vue-next' })],
    }),
    svgLoader({ defaultImport: 'url' }),
  ],
  css: {
    preprocessorOptions: {
      less: {
        additionalData: '@import (reference) "@/styles/index.less";\n',
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@wangeditor/')) return 'wang-editor'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8090',
    },
  },
})
