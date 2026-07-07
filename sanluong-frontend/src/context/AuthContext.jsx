import React, { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

const STAGE_ROLES = ['ADMIN_PC', 'ADMIN_BBC1', 'ADMIN_PL', 'ADMIN_DG', 'ADMIN_PCPL1', 'ADMIN_PCPL2', 'ADMIN_PCPL3']
const NV_ROLES = ['NHAN_VIEN', 'NHAN_VIEN_PCPL1', 'NHAN_VIEN_PCPL2', 'NHAN_VIEN_PCPL3', 'NHAN_VIEN_BBC1', 'NHAN_VIEN_DG']

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

  const updateUser = (updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
  }

  const logout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
  }

  // Giám đốc: chỉ xem, có dashboard riêng
  const isGiamDoc = () => user?.role === 'GD'

  // Quản trị viên toàn quyền
  const isAdmin = () => user?.role === 'ADMIN'

  // Admin kế hoạch: sản lượng, kế hoạch, danh mục mã SP, hàng dở dang
  const isAdminKH = () => user?.role === 'ADMIN_KH'

  // Nhân viên thường: chỉ xem lịch tổ và tab Nhân Viên của chính mình
  const isNhanVien = () => NV_ROLES.includes(user?.role)

  const getMaNhanVien = () => user?.maNhanVien || null
  const getToNhom = () => user?.toNhom || null

  // Tài khoản sản xuất: tương đương ADMIN trừ write Lệnh Sản Xuất
  const isTKSX = () => user?.role === 'TKSX'

  // Trưởng phòng sản xuất: xem như ADMIN nhưng không có quyền thêm/sửa/xóa
  const isTPSX = () => user?.role === 'TPSX'

  // Quản lý chỉ đọc
  const isQuanDoc = () => user?.role === 'QUAN_DOC'

  // HCNS: chỉ xem nhân viên
  const isHCNS = () => user?.role === 'HCNS'

  // Kế toán: chỉ xem sản lượng, sản lượng theo ngày, chấm công
  const isKeToan = () => user?.role === 'KE_TOAN'

  // Màn hình hiển thị: chỉ xem tab Báo cáo tổng hợp ngày
  const isManHinh = () => user?.role === 'MAN_HINH'

  // Có thể thêm/sửa/xóa trong tab Kế hoạch (lịch kế hoạch): ADMIN + ADMIN_KH + TKSX
  const canEditPlan = () => ['ADMIN', 'ADMIN_KH', 'TKSX'].includes(user?.role)

  // Có thể thêm/sửa/xóa Lệnh Sản Xuất: ADMIN, ADMIN_KH, ADMIN_BBC1
  const canEditLenh = () => ['ADMIN', 'ADMIN_KH', 'ADMIN_BBC1'].includes(user?.role)

  // Xóa bản ghi Lịch làm việc — chỉ ADMIN, ADMIN_KH, ADMIN_PC; các stage admin không được xóa
  const NO_DELETE_SCHEDULE_ROLES = ['ADMIN_PCPL1', 'ADMIN_PCPL2', 'ADMIN_PCPL3', 'ADMIN_BBC1', 'ADMIN_PL', 'ADMIN_DG']
  const canDeleteSchedule = () => !NO_DELETE_SCHEDULE_ROLES.includes(user?.role)

  // Có thể tạo/sửa/xóa bản ghi Sản lượng và WIP
  const canEditProduction = () => ['ADMIN', 'TKSX', 'ADMIN_KH', ...NV_ROLES].includes(user?.role)

  // Có thể thêm/sửa/xóa Danh mục Mã SP — tất cả ADMIN_* roles
  const canEditProductMaster = () => ['ADMIN', 'TKSX', 'ADMIN_KH', ...STAGE_ROLES].includes(user?.role)

  // Có thể chỉnh sửa Lịch làm việc của công đoạn cụ thể
  // CC: chỉ ADMIN và ADMIN_PC; các công đoạn khác: ADMIN, NHAN_VIEN, ADMIN_*
  // ADMIN_KH: chỉ xem, không sửa lịch sản xuất
  const canEditStage = (congDoan) => {
    if (user?.role === 'ADMIN') return true
    if (congDoan === 'CC')    return ['ADMIN_PC', 'ADMIN_PCPL2'].includes(user?.role)
    if (congDoan === 'PCPL1') return ['ADMIN_PC', 'ADMIN_PCPL1'].includes(user?.role)
    if (congDoan === 'PCPL2') return ['ADMIN_PC', 'ADMIN_PCPL2'].includes(user?.role)
    if (congDoan === 'PL')    return ['ADMIN_PL', 'ADMIN_PCPL3', 'ADMIN_PCPL1'].includes(user?.role)
    return user?.role === `ADMIN_${congDoan}`
  }

  // Là admin công đoạn (không phải admin toàn quyền)
  const isStageAdmin = () => STAGE_ROLES.includes(user?.role)

  // Có thể thêm/sửa/xóa bản ghi Công Ra Vào (chấm công giờ): ADMIN + HCNS
  const canEditAttendance = () => ['ADMIN', 'HCNS'].includes(user?.role)

  // Có thể đặt mục tiêu Nhập Kho: ADMIN, ADMIN_KH, TKSX, QUAN_DOC
  const canEditNhapKhoTarget = () => ['ADMIN', 'ADMIN_KH', 'TKSX', 'QUAN_DOC'].includes(user?.role)

  // Có thể nhập/sửa xử lý hàng lỗi: tất cả ADMIN_* + TKSX
  const canEditHangLoi = () => [
    'ADMIN', 'TKSX',
    'ADMIN_KH', 'ADMIN_PC', 'ADMIN_BBC1',
    'ADMIN_PL', 'ADMIN_DG',
    'ADMIN_PCPL1', 'ADMIN_PCPL2', 'ADMIN_PCPL3',
  ].includes(user?.role)

  // Các tab Hiệu quả công việc được phép xem
  // null = tất cả; mảng = chỉ các tab được liệt kê
  const allowedEfficiencyTabs = () => {
    const role = user?.role
    if (role === 'ADMIN_BBC1') return ['BBC1']
    if (role === 'ADMIN_DG') return ['ĐG']
    if (role === 'ADMIN_PC' || role === 'ADMIN_PL') return ['PCPL1', 'PCPL2', 'PCPL3']
    if (role === 'ADMIN_PCPL1') return ['PCPL1']
    if (role === 'ADMIN_PCPL2') return ['PCPL2']
    if (role === 'ADMIN_PCPL3') return ['PCPL3']
    if (role === 'TPSX') return null // xem tất cả như ADMIN
    if (role === 'ADMIN_KH') return []
    // NV roles — tabs không dùng vì isNhanVien() filter riêng
    if (role === 'NHAN_VIEN_PCPL1') return ['PCPL1']
    if (role === 'NHAN_VIEN_PCPL2') return ['PCPL2']
    if (role === 'NHAN_VIEN_PCPL3') return ['PCPL3']
    if (role === 'NHAN_VIEN_BBC1')  return ['BBC1']
    if (role === 'NHAN_VIEN_DG')    return ['ĐG']
    return null // ADMIN, NHAN_VIEN → tất cả
  }

  // Nhóm thực hiện được phép xem/sửa (chỉ áp dụng tab PC)
  // null = không hạn chế; string = chỉ nhóm đó
  const getAllowedNhom = () => {
    const role = user?.role
    if (role === 'ADMIN_PCPL1') return 'PCPL1'
    if (role === 'ADMIN_PCPL2') return 'PCPL2'
    // PCPL3 quản lý PL, không phải PC → không hạn chế nhom trên tab PC
    return null
  }

  // Nhóm nhân sự được phép xem và quản lý
  // null = tất cả; mảng = chỉ các nhóm được liệt kê
  const getAllowedEmployeeGroups = () => {
    const role = user?.role
    if (role === 'ADMIN_BBC1') return ['BBC1']
    if (role === 'ADMIN_DG')   return ['ĐG']
    if (role === 'ADMIN_PC' || role === 'ADMIN_PL') return ['PCPL1', 'PCPL2', 'PCPL3']
    if (role === 'ADMIN_PCPL1') return ['PCPL1']
    if (role === 'ADMIN_PCPL2') return ['PCPL2']
    if (role === 'ADMIN_PCPL3') return ['PCPL3']
    return null // ADMIN, ADMIN_KH, TKSX, QUAN_DOC, NHAN_VIEN → tất cả
  }

  // Các tab Lịch làm việc được phép xem
  // null = tất cả; mảng = chỉ các stage được liệt kê
  const getAllowedStages = () => {
    const role = user?.role
    if (role === 'ADMIN_PC')    return ['PCPL1', 'PCPL2']
    if (role === 'ADMIN_BBC1')  return ['BBC1']
    if (role === 'ADMIN_PL')    return ['PL']
    if (role === 'ADMIN_DG')    return ['DG']
    if (role === 'ADMIN_PCPL1') return ['PCPL1', 'PL']
    if (role === 'ADMIN_PCPL2') return ['PCPL2', 'CC']
    if (role === 'ADMIN_PCPL3') return ['PL']
    // Nhân viên theo nhóm cụ thể
    if (role === 'NHAN_VIEN_PCPL1') return ['PCPL1']
    if (role === 'NHAN_VIEN_PCPL2') return ['PCPL2']
    if (role === 'NHAN_VIEN_PCPL3') return ['PL']
    if (role === 'NHAN_VIEN_DG')    return ['DG']
    if (role === 'NHAN_VIEN_BBC1')  return ['BBC1']
    if (role === 'NHAN_VIEN') {
      const toNhom = user?.toNhom
      if (!toNhom) return null
      if (toNhom === 'PCPL1') return ['PCPL1']
      if (toNhom === 'PCPL2') return ['PCPL2']
      if (toNhom === 'PCPL3') return ['PL']
      if (toNhom === 'ĐG')   return ['DG']
      if (toNhom === 'BBC1') return ['BBC1']
      return null
    }
    return null // ADMIN, ADMIN_KH → tất cả
  }

  // Trả về key công đoạn duy nhất mà user được phép xem trong Sản lượng / Phân tích
  // null = không hạn chế (ADMIN, TKSX, ADMIN_PC, ADMIN_PL, v.v.)
  const getLockedCongDoan = () => {
    const role = user?.role
    if (role === 'ADMIN_DG')    return 'DG'
    if (role === 'ADMIN_BBC1')  return 'BBC1'
    if (role === 'ADMIN_PCPL1') return 'PCPL1'
    if (role === 'ADMIN_PCPL2') return 'PCPL2'
    if (role === 'ADMIN_PCPL3') return 'PL'
    if (role === 'ADMIN_PL')    return 'PL'
    return null
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAdmin, isAdminKH, isTKSX, isTPSX, isQuanDoc, isGiamDoc, isNhanVien, isHCNS, isKeToan, isManHinh, getMaNhanVien, getToNhom, canEditProduction, canEditProductMaster, canEditPlan, canEditLenh, canEditStage, isStageAdmin, canEditHangLoi, canEditAttendance, canEditNhapKhoTarget, allowedEfficiencyTabs, getAllowedNhom, getAllowedStages, getAllowedEmployeeGroups, canDeleteSchedule, getLockedCongDoan }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
