import React from 'react'
import { Tabs } from 'antd'
import {
  BarChartOutlined, ThunderboltOutlined, ToolOutlined,
  UserOutlined, ScheduleOutlined, BulbOutlined,
} from '@ant-design/icons'
import KyThuatTongQuanTab from './KyThuatTongQuanTab'
import KyThuatCoDienTab from './KyThuatCoDienTab'
import KyThuatKyThuatTab from './KyThuatKyThuatTab'
import KyThuatThuViecTab from './KyThuatThuViecTab'
import KyThuatBaoTriTab from './KyThuatBaoTriTab'
import KyThuatKaizenTab from './KyThuatKaizenTab'

export default function KyThuatCongNghePage() {
  const items = [
    { key: 'tong-quan', label: <span><BarChartOutlined /> Tổng quan</span>, children: <KyThuatTongQuanTab /> },
    { key: 'co-dien',   label: <span><ThunderboltOutlined /> Cơ điện</span>, children: <KyThuatCoDienTab /> },
    { key: 'ky-thuat',  label: <span><ToolOutlined /> Kỹ thuật</span>, children: <KyThuatKyThuatTab /> },
    { key: 'thu-viec',  label: <span><UserOutlined /> Thử việc</span>, children: <KyThuatThuViecTab /> },
    { key: 'bao-tri',   label: <span><ScheduleOutlined /> Bảo trì thiết bị</span>, children: <KyThuatBaoTriTab /> },
    { key: 'kaizen',    label: <span><BulbOutlined /> Kaizen</span>, children: <KyThuatKaizenTab /> },
  ]

  return (
    <div className="kyt-page">
      <style>{`
        /* Tab đang chọn: theme mặc định set màu trắng cho tab active (itemSelectedColor),
           bị chìm trên nền trắng — đổi sang pill teal để luôn nhìn thấy được. */
        .kyt-page .ant-tabs-tab .ant-tabs-tab-btn { color: #5a6b76; font-weight: 600; transition: color .15s; }
        .kyt-page .ant-tabs-tab:hover .ant-tabs-tab-btn { color: #339999; }
        .kyt-page .ant-tabs-tab-active { background: #339999 !important; border-radius: 6px 6px 0 0; }
        .kyt-page .ant-tabs-tab-active .ant-tabs-tab-btn { color: #ffffff !important; }
        .kyt-page .ant-tabs-ink-bar { background: #339999 !important; }

        /* Thanh tiêu đề bảng: màu #339999, cố định khi cuộn */
        .kyt-page .ant-table-thead > tr > th {
          background: #339999 !important;
          color: #ffffff !important;
          position: sticky;
          top: 0;
          z-index: 2;
        }
      `}</style>
      <h2 style={{ marginBottom: 16 }}>Tổ Kỹ thuật – Công nghệ</h2>
      <Tabs items={items} destroyInactiveTabPane={false} />
    </div>
  )
}
