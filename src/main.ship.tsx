import React from 'react';
import ReactDOM from 'react-dom/client';
import AppShip from './App.ship';
import './index.css';
import { AdminProvider } from './contexts/AdminContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastViewport } from './components/Toast';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AdminProvider>
        <AppShip />
        <ToastViewport />
      </AdminProvider>
    </ToastProvider>
  </React.StrictMode>
);

