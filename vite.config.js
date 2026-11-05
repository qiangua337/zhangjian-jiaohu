import { defineConfig } from 'vite';

export default defineConfig({
  server: { watch: { ignored: ['**/public/artworks/**', '**/public/samples/**'] } },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          vision: ['@mediapipe/tasks-vision'],
        },
      },
    },
  },
});
