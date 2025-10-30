import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [
      vue(),
      nodePolyfills({
        // 启用需要的 polyfills
        include: ['path', 'stream', 'util', 'buffer', 'process', 'events', 'crypto'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        // 为浏览器环境提供空的 bittorrent-dht 实现
        'bittorrent-dht': fileURLToPath(new URL('./src/polyfills/bittorrent-dht.ts', import.meta.url)),
        'bittorrent-dht/client': fileURLToPath(new URL('./src/polyfills/bittorrent-dht.ts', import.meta.url)),
      }
    },
    server: {
      port: 3000,
      open: true,
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        external: [],
        output: {
          manualChunks: {
            // 将 Vue 相关库分离到单独的 chunk
            'vue-vendor': ['vue'],
            // 将 WebTorrent 相关库分离到单独的 chunk
            'webtorrent-vendor': ['webtorrent'],
            // 将加密相关库分离到单独的 chunk
            'crypto-vendor': ['uuid', 'localforage'],
          },
        },
      },
      chunkSizeWarningLimit: 1000, // 提高警告阈值到 1000 kB
    },
    optimizeDeps: {
      exclude: ['bittorrent-dht'],
    },
    base: env.BASE_URL+'/'  //找资源
  }
})
