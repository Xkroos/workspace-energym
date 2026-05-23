import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// 1. 🚀 Importa BrowserRouter
import { BrowserRouter } from 'react-router-dom'; 
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 2. 🧱 Envuelve <App /> con <BrowserRouter> */}
    <BrowserRouter> 
      <App />
    </BrowserRouter>
  </StrictMode>
);