import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RecordFormPage from './pages/RecordFormPage'
import UserManagePage from './pages/UserManagePage'
import ProductMasterPage from './pages/ProductMasterPage'
import WorkSchedulePage from './pages/WorkSchedulePage'
import HangLoiPage from './pages/HangLoiPage'
import KhoachPage from './pages/KhoachPage'
import EmployeePage from './pages/EmployeePage'
import WorkEfficiencyPage from './pages/WorkEfficiencyPage'
import DailySanLuongPage from './pages/DailySanLuongPage'
import ChamCongPage from './pages/ChamCongPage'
import TrashPage from './pages/TrashPage'
import DanhMucPage from './pages/DanhMucPage'
import NotificationPage from './pages/NotificationPage'
import LenhSanXuatPage from './pages/LenhSanXuatPage'
import DonHangPage from './pages/DonHangPage'
import MainLayout from './components/MainLayout'

function PrivateRoute({ children, adminOnly = false, allowedRoles = null }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin()) return <Navigate to="/" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

function HomeRoute() {
  const { user } = useAuth()
  if (user?.role === 'NHAN_VIEN') return <Navigate to="/work-schedule" replace />
  return <DashboardPage />
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
        <Route index element={<HomeRoute />} />
        <Route path="work-schedule" element={<WorkSchedulePage />} />
        <Route path="record/new" element={<RecordFormPage />} />
        <Route path="record/edit/:id" element={<RecordFormPage />} />
        <Route path="users" element={
          <PrivateRoute adminOnly>
            <UserManagePage />
          </PrivateRoute>
        } />
        <Route path="hang-loi" element={<HangLoiPage />} />
        <Route path="khoach" element={<KhoachPage />} />
        <Route path="product-master" element={
          <PrivateRoute allowedRoles={['ADMIN', 'ADMIN_KH']}>
            <ProductMasterPage />
          </PrivateRoute>
        } />
        <Route path="employees" element={<EmployeePage />} />
        <Route path="work-efficiency" element={
          <PrivateRoute allowedRoles={['ADMIN', 'NHAN_VIEN', 'ADMIN_PC', 'ADMIN_BBC1', 'ADMIN_PL', 'ADMIN_DG', 'ADMIN_PCPL1', 'ADMIN_PCPL2', 'ADMIN_PCPL3']}>
            <WorkEfficiencyPage />
          </PrivateRoute>
        } />
        <Route path="daily-sl" element={<DailySanLuongPage />} />
        <Route path="cham-cong" element={
          <PrivateRoute adminOnly>
            <ChamCongPage />
          </PrivateRoute>
        } />
        <Route path="trash" element={
          <PrivateRoute adminOnly>
            <TrashPage />
          </PrivateRoute>
        } />
        <Route path="danh-muc" element={<DanhMucPage />} />
        <Route path="notifications" element={<NotificationPage />} />
        <Route path="lenh-san-xuat" element={<LenhSanXuatPage />} />
        <Route path="don-hang" element={<DonHangPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
