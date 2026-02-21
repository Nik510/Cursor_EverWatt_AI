import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ModuleHubShip } from './pages/ModuleHubShip';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppShip() {
  const withBoundary = (el: React.ReactNode) => <ErrorBoundary>{el}</ErrorBoundary>;
  return (
    <Router>
      <Routes>
        <Route path="/" element={withBoundary(<ModuleHubShip />)} />

        {/* Catch all - redirect to hub */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default AppShip;

