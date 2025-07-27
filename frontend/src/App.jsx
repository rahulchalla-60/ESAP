
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import ProviderDashboard from './pages/ProviderDashboard';

function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/provider-dashboard" element={<ProviderDashboard />} />
      <Route path="/" element={<Navigate to="/register" replace />} />
    </Routes>
  );
}

export default App;
