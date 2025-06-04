import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './dashboard/pages/dashboard';
import Login from './dashboard/pages/Login';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<Login />} /> {/* ✅ 로그인 라우트 추가 */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);