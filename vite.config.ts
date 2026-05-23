import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // ⚙️ INICIO DE LA CONFIGURACIÓN DEL PROXY PARA CORS
  server: {
    proxy: {
      // Cuando la aplicación llame a '/api/', el proxy redirigirá a la API externa
      '/api': { 
        target: 'https://pydolarve.org',
        changeOrigin: true, // Importante: simula que la solicitud viene del target
        rewrite: (path) => path.replace(/^\/api/, '') // Elimina el prefijo '/api' antes de enviarlo
      }
    }
  }
  // ⚙️ FIN DE LA CONFIGURACIÓN DEL PROXY
});