import React, { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

const STAGE_ROLES = ['ADMIN_PC', 'ADMIN_BBC1', 'ADMIN_PL', 'ADMIN_DG']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', userData.token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
  }

  // Quản trị viên toàn quyền
  const isAdmin = () => user?.role === 'ADMIN'

  // Admin kế hoạch: sản lượng, kế hoạch, danh mục mã SP, hàng dở dang
  const isAdminKH = () => user?.role === 'ADMIN_KH'

  // Có thể thêm/sửa/xóa trong tab Kế hoạch
  const canEditPlan = () => ['ADMIN', 'ADMIN_KH'].includes(user?.role)

  // Có thể tạo/sửa/xóa bản ghi Sản lượng và WIP
  const canEditProduction = () => ['ADMIN', 'NHAN_VIEN', 'ADMIN_KH'].includes(user?.role)

  // Có thể thêm/sửa/xóa Danh mục Mã SP
  const canEditProductMaster = () => ['ADMIN', 'ADMIN_KH'].includes(user?.role)

  // Có thể chỉnh sửa Lịch làm việc của công đoạn cụ thể
  // CC: chỉ ADMIN và ADMIN_PC; các công đoạn khác: ADMIN, NHAN_VIEN, ADMIN_*
  const canEditStage = (congDoan) => {
    if (user?.role === 'ADMIN') return true
    if (user?.role === 'ADMIN_KH') return true
    if (congDoan === 'CC') return user?.role === 'ADMIN_PC'
    return user?.role === 'NHAN_VIEN' || user?.role === `ADMIN_${congDoan}`
  }

  // Là admin công đoạn (không phải admin toàn quyền)
  const isStageAdmin = () => STAGE_ROLES.includes(user?.role)

  // Có thể thêm/sửa/xóa Hàng Lỗi
  const canEditHangLoi = () => ['ADMIN', 'ADMIN_PL', 'ADMIN_DG'].includes(user?.role)

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isAdminKH, canEditProduction, canEditProductMaster, canEditPlan, canEditStage, isStageAdmin, canEditHangLoi }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
