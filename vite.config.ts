import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0', // allows external access for dev
    },
    preview: {
      port: parseInt(process.env.PORT) || 4173, // use Render’s dynamic port
      host: true, // bind to 0.0.0.0 so Render can access it
      allowedHosts: ['speach-fm.onrender.com'], // whitelist your Render host
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
