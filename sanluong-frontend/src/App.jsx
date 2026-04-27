import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RecordFormPage from './pages/RecordFormPage'
import UserManagePage from './pages/UserManagePage'
import ProductMasterPage from './pages/ProductMasterPage'
import WorkSchedulePage from './pages/WorkSchedulePage'
import WipPage from './pages/WipPage'
import HangLoiPage from './pages/HangLoiPage'
import KhoachPage from './pages/KhoachPage'
import MainLayout from './components/MainLayout'

function PrivateRoute({ children, adminOnly = false, allowedRoles = null }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin()) return <Navigate to="/" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="work-schedule" element={<WorkSchedulePage />} />
        <Route path="record/new" element={<RecordFormPage />} />
        <Route path="record/edit/:id" element={
          <PrivateRoute adminOnly>
            <RecordFormPage />
          </PrivateRoute>
        } />
        <Route path="users" element={
          <PrivateRoute adminOnly>
            <UserManagePage />
          </PrivateRoute>
        } />
        <Route path="wip" element={<WipPage />} />
        <Route path="hang-loi" element={<HangLoiPage />} />
        <Route path="khoach" element={<KhoachPage />} />
        <Route path="product-master" element={
          <PrivateRoute allowedRoles={['ADMIN', 'ADMIN_KH']}>
            <ProductMasterPage />
          </PrivateRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
