import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios' // ✨ Impor axios terlebih dahulu

// =======================================================
// 💡 PENCEGAT AXIOS GLOBAL (CLEANER URL LOCALHOST)
// =======================================================
axios.interceptors.request.use(
  (config) => {
    // Jika ada rute komponen yang masih menembak ke localhost:5000
    if (config.url && config.url.includes('localhost:5000')) {
      // Otomatis potong alamat tersebut menjadi jalur relatif Vercel
      config.url = config.url.replace('http://localhost:5000', '');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Proses render utama aplikasi React
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)