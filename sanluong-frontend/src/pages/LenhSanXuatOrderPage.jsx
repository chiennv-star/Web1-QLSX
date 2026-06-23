import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button, message, Tooltip, Input, Popconfirm, Spin } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined, PlusOutlined, SaveOutlined, CheckCircleOutlined, TagsOutlined, FileTextOutlined, TableOutlined, PictureOutlined, EditOutlined, DeleteOutlined, SyncOutlined } from '@ant-design/icons'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import api from '../api/axios'

const fmtNum  = (v) => v != null && v !== '' ? Number(v).toLocaleString('vi-VN') : ''
const fmtDate = (v) => v ? dayjs(v).format('DD/MM/YYYY') : ''
const EMPTY_ROW = () => ({ maVatTu: '', ten: '', loNVL: '', dvt: '', tyLe: '', dm1: '', dmLo: '', ghiChu: '' })

const COLS = [
  { key: 'maVatTu', label: 'Mã vật tư'           },
  { key: 'ten',     label: 'Nguyên liệu / Phụ liệu' },
  { key: 'loNVL',   label: 'Lô NVL + NCC'         },
  { key: 'dvt',     label: 'Đvt'                   },
  { key: 'tyLe',    label: 'Tỷ lệ (%)'             },
  { key: 'dm1',     label: 'ĐM 1 ĐVSP'             },
  { key: 'dmLo',    label: 'ĐM theo lô'            },
  { key: 'ghiChu',  label: 'Ghi chú'               },
]

// Dữ liệu mẫu (từ HTML gốc — đầy đủ 17 NVL + 2 bao bì)
const DEMO = {
  tenSanPham: 'Dầu gội cho tóc hư tổn 5L', maTP: '10301529',
  soLuongPhaChe: '465', quyCach: 'Can 5kg', soDangKy: '27855/26/CBMP-HN',
  hanDung: '24 tháng', soLoSanXuat: '', ngaySanXuat: '', hanSuDung: '', luuY: '', maDonHang: '',
  nguyenVatLieu: [
    { maVatTu: '309084', ten: 'Nước tinh khiết',                                             loNVL: '', dvt: 'Gram', tyLe: '', dm1: '3.090,0000000', dmLo: '1.436.850,000', ghiChu: '' },
    { maVatTu: '309578', ten: 'Supersurf SLSC 30',                                            loNVL: '', dvt: 'Gram', tyLe: '', dm1: '500,0000000',   dmLo: '232.500,000',   ghiChu: '' },
    { maVatTu: '309577', ten: 'Supersurf CPH35',                                              loNVL: '', dvt: 'Gram', tyLe: '', dm1: '500,0000000',   dmLo: '232.500,000',   ghiChu: '' },
    { maVatTu: '309347', ten: 'Sodium alpha olefine sulphonate powder (Ginasul 68G)',         loNVL: '', dvt: 'Gram', tyLe: '', dm1: '450,0000000',   dmLo: '209.250,000',   ghiChu: '' },
    { maVatTu: '309328', ten: 'Mascerol Glycerin 99,7% USP',                                  loNVL: '', dvt: 'Gram', tyLe: '', dm1: '100,0000000',   dmLo: '46.500,000',    ghiChu: '' },
    { maVatTu: '309750', ten: 'Cetiol® HE',                                                   loNVL: '', dvt: 'Gram', tyLe: '', dm1: '90,0000000',    dmLo: '41.850,000',    ghiChu: '' },
    { maVatTu: '309582', ten: 'Sinopol 6000DS',                                               loNVL: '', dvt: 'Gram', tyLe: '', dm1: '75,0000000',    dmLo: '34.875,000',    ghiChu: '' },
    { maVatTu: '309579', ten: 'Diasleek C-822',                                               loNVL: '', dvt: 'Gram', tyLe: '', dm1: '50,0000000',    dmLo: '23.250,000',    ghiChu: '' },
    { maVatTu: '301012', ten: 'Dầu bơ',                                                       loNVL: '', dvt: 'Gram', tyLe: '', dm1: '5,0000000',     dmLo: '2.325,000',     ghiChu: '' },
    { maVatTu: '309601', ten: 'Reflez PCA GO',                                                loNVL: '', dvt: 'Gram', tyLe: '', dm1: '35,0000000',    dmLo: '16.275,000',    ghiChu: '' },
    { maVatTu: '309233', ten: 'Promois WK-F',                                                 loNVL: '', dvt: 'Gram', tyLe: '', dm1: '1,5000000',     dmLo: '697,500',       ghiChu: '' },
    { maVatTu: '309592', ten: 'Cationic Guar NU-C14',                                         loNVL: '', dvt: 'Gram', tyLe: '', dm1: '20,0000000',    dmLo: '9.300,000',     ghiChu: '' },
    { maVatTu: '309138', ten: 'Citric acid monohydrate',                                      loNVL: '', dvt: 'Gram', tyLe: '', dm1: '23,5000000',    dmLo: '10.927,500',    ghiChu: '' },
    { maVatTu: '309242', ten: 'Ethylenediamine Tetraacetic Acid disodium (EDTA)',              loNVL: '', dvt: 'Gram', tyLe: '', dm1: '2,5000000',     dmLo: '1.162,500',     ghiChu: '' },
    { maVatTu: '308307', ten: 'Troycare PE91',                                                loNVL: '', dvt: 'Gram', tyLe: '', dm1: '40,0000000',    dmLo: '18.600,000',    ghiChu: '' },
    { maVatTu: '306576', ten: 'Hương Della 60742',                                            loNVL: '', dvt: 'Gram', tyLe: '', dm1: '15,0000000',    dmLo: '6.975,000',     ghiChu: '' },
    { maVatTu: '306274', ten: 'Little But Big',                                               loNVL: '', dvt: 'Gram', tyLe: '', dm1: '2,5000000',     dmLo: '1.162,500',     ghiChu: '' },
  ],
  baoBi: [
    { maVatTu: '501502',  ten: 'Can nhựa trắng 5L',              loNVL: '', dvt: 'Cái', tyLe: '', dm1: '1,0000000', dmLo: '465,000', ghiChu: '' },
    { maVatTu: '5021140', ten: 'Nhãn dầu gội cho tóc hư tổn 5L', loNVL: '', dvt: 'Cái', tyLe: '', dm1: '1,0200000', dmLo: '474,300', ghiChu: '' },
  ],
}

function MaterialTable({ rows, setRows, sectionLabel, startStt }) {
  const addRow    = () => setRows(p => [...p, EMPTY_ROW()])
  const removeRow = (i) => setRows(p => p.filter((_, idx) => idx !== i))
  const update    = (i, key, val) => setRows(p => p.map((r, idx) => idx === i ? { ...r, [key]: val } : r))

  return (
    <>
      <tbody>
        <tr className="lsx-section">
          <td colSpan={10}>{sectionLabel}</td>
        </tr>
        {rows.map((row, i) => (
          <tr key={i}>
            <td style={{ textAlign: 'center', color: '#6b7178', fontSize: 12, width: 34 }}>
              {startStt + i}
            </td>
            {COLS.map(col => (
              <td key={col.key} className={`lsx-td-${col.key}`}>
                <input className="lsx-cell" value={row[col.key] ?? ''} onChange={e => update(i, col.key, e.target.value)} />
              </td>
            ))}
            <td className="lsx-td-act no-print">
              <button className="lsx-row-x" title="Xóa dòng" onClick={() => removeRow(i)}>✕</button>
            </td>
          </tr>
        ))}
      </tbody>
      <tbody className="no-print">
        <tr>
          <td colSpan={10} style={{ padding: '4px 6px', background: '#fafbfc', borderTop: '1px dashed #c9ccd2' }}>
            <button className="lsx-add-btn" onClick={addRow}>
              <PlusOutlined style={{ fontSize: 11 }} /> Thêm dòng
            </button>
          </td>
        </tr>
      </tbody>
    </>
  )
}

const COMPANY = 'Công ty Cổ phần Mỹ phẩm Thiên nhiên Song An'

function DinhMucVatTu({ nvl, baoBi, header, onGoNhan }) {
  const DM_COLS = [
    { key: 'maVatTu', label: 'Mã vật tư',            w: 90  },
    { key: 'ten',     label: 'Nguyên liệu / Phụ liệu', w: undefined },
    { key: 'dvt',     label: 'ĐVT',                   w: 52  },
    { key: 'tyLe',    label: 'Tỷ lệ (%)',              w: 62  },
    { key: 'dm1',     label: 'ĐM 1 ĐVSP',             w: 110 },
    { key: 'dmLo',    label: 'ĐM theo lô',             w: 110 },
    { key: 'ghiChu',  label: 'Ghi chú',                w: 80  },
  ]
  const totalRows = nvl.length + baoBi.length

  const Section = ({ rows, label, startStt }) => (
    <>
      <tr style={{ background: '#f0f4ff' }}>
        <td colSpan={DM_COLS.length + 1}
          style={{ padding: '5px 10px', fontWeight: 700, fontSize: 12.5, color: '#1e4570' }}>
          {label}
        </td>
      </tr>
      {rows.length === 0
        ? <tr><td colSpan={DM_COLS.length + 1}
            style={{ padding: '8px 10px', color: '#9aa0a8', fontSize: 12, fontStyle: 'italic' }}>
            Chưa có dữ liệu
          </td></tr>
        : rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 1 ? '#fafbfc' : '#fff' }}>
            <td style={{ textAlign: 'center', color: '#6b7178', fontSize: 12, width: 34, padding: '5px 4px' }}>
              {startStt + i}
            </td>
            {DM_COLS.map(col => (
              <td key={col.key} style={{
                padding: '5px 8px', fontSize: 13, color: '#1b1d21',
                borderBottom: '1px solid #edf0f4',
                maxWidth: col.w,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {row[col.key] || ''}
              </td>
            ))}
          </tr>
        ))
      }
    </>
  )

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14,
        background: '#fff', border: '1px solid #dde1e8', borderRadius: 10,
        padding: '12px 18px', marginBottom: 16,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e4570' }}>Định mức vật tư</span>
        <span style={{ fontSize: 12.5, color: '#6b7178' }}>
          {header?.tenSanPham && <><strong style={{ color: '#1b1d21' }}>{header.tenSanPham}</strong> &nbsp;·&nbsp;</>}
          {header?.soLoSanXuat && <>Lô: <strong style={{ color: '#1b1d21' }}>{header.soLoSanXuat}</strong> &nbsp;·&nbsp;</>}
          {header?.soLuongPhaChe && <>SL pha chế: <strong style={{ color: '#1b1d21' }}>{header.soLuongPhaChe}</strong></>}
        </span>
        <span style={{
          marginLeft: 4, background: '#e0f2fe', color: '#0369a1',
          borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600,
        }}>
          {totalRows} vật tư
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onGoNhan}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '7px 16px', borderRadius: 8,
            background: '#7c3aed', border: 'none', color: '#fff',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <TagsOutlined /> Nhãn cân chia mẻ
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: '#fff', border: '1px solid #dde1e8', borderRadius: 10,
        overflow: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f7fa', borderBottom: '2px solid #dde1e8' }}>
              <th style={{ width: 34, padding: '8px 4px', textAlign: 'center', color: '#6b7178', fontSize: 12 }}>Stt</th>
              {DM_COLS.map(col => (
                <th key={col.key} style={{
                  padding: '8px 8px', textAlign: 'left',
                  color: '#3a3f47', fontSize: 12.5, fontWeight: 700,
                  width: col.w,
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Section rows={nvl}   label="Nguyên vật liệu" startStt={1} />
            <Section rows={baoBi} label="Bao bì"           startStt={1} />
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NhanCanChiaMe({ nvl, header }) {
  const [nguoiTH,      setNguoiTH]      = useState('')
  const [nguoiKiemTra, setNguoiKiemTra] = useState('')
  const [ngayTH,       setNgayTH]       = useState(header?.ngaySanXuat || '')

  const pages = []
  const items = nvl.length > 0 ? nvl : []
  for (let i = 0; i < Math.max(items.length, 1); i += 8) {
    pages.push(items.slice(i, i + 8))
  }

  const S = { fontSize: '8.5px', lineHeight: 1.3 }
  const FRow = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3mm' }}>{children}</div>
  )
  const FCell = ({ label, value, wrap }) => (
    <div style={{
      display: 'flex', gap: '1.5mm', alignItems: 'flex-end',
      borderBottom: '0.75px solid #444',
      paddingBottom: '0.5mm',
      minHeight: wrap ? '8mm' : '5mm',
    }}>
      <span style={{ ...S, whiteSpace: 'nowrap', flexShrink: 0, color: '#222' }}>{label}</span>
      <span style={{
        ...S, flex: 1, color: '#111',
        whiteSpace: wrap ? 'normal' : 'nowrap',
        wordBreak: wrap ? 'break-word' : undefined,
        overflow: 'hidden',
      }}>{value}</span>
    </div>
  )

  const SingleLabel = ({ row }) => (
    <div className="nhan-label">
      <div className="nhan-company">{COMPANY}</div>
      <div className="nhan-title">NHÃN CÂN CHIA MẺ</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginTop: '1.5mm' }}>
        <FRow>
          <FCell label="Tên NPL:" value={row?.ten || ''} wrap />
          <FCell label="Mã:" value={row?.maVatTu || ''} />
        </FRow>
        <FRow>
          <FCell label="Khối lượng (g):" value={row?.dmLo || ''} />
          <FCell label="Khối lượng bì (g):" value="" />
        </FRow>
        <FRow>
          <FCell label="Tên SP:" value={header?.tenSanPham || ''} wrap />
          <FCell label="Số lô SP:" value={header?.soLoSanXuat || ''} />
        </FRow>
        <FRow>
          <FCell label="Số mẻ:" value="" />
          <FCell label="Ngày TH:" value={ngayTH} />
        </FRow>
        <FRow>
          <FCell label="Người TH:" value={nguoiTH} />
          <FCell label="Người kiểm tra:" value={nguoiKiemTra} />
        </FRow>
      </div>
    </div>
  )

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: '#6b7178', fontSize: 14 }}>
        Chưa có nguyên vật liệu. Vui lòng điền tờ lệnh sản xuất trước.
      </div>
    )
  }

  const handleExportWord = () => {
    const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

    const labelHtml = (row) => {
      const FIELDS = [
        [`Tên NPL: ${esc(row?.ten)}`,                    `Mã: ${esc(row?.maVatTu)}`],
        [`Khối lượng (g): ${esc(row?.dmLo)}`,            `Khối lượng bì (g):`],
        [`Tên SP: ${esc(header?.tenSanPham)}`,           `Số lô SP: ${esc(header?.soLoSanXuat)}`],
        [`Số mẻ:`,                                        `Ngày TH: ${esc(ngayTH)}`],
        [`Người TH: ${esc(nguoiTH)}`,                    `Người kiểm tra: ${esc(nguoiKiemTra)}`],
      ]
      const fieldRows = FIELDS.map(([l, r]) =>
        `<tr>
          <td style="font-size:8.5pt;padding:1.5pt 3pt 0 0;border-bottom:.6pt solid #555;width:50%">${l}&nbsp;</td>
          <td style="font-size:8.5pt;padding:1.5pt 0 0 2pt;border-bottom:.6pt solid #555">${r}&nbsp;</td>
        </tr>`
      ).join('')
      return `<table cellspacing="0" cellpadding="0"
          style="width:100%;height:100%;border:.75pt solid #000;border-collapse:collapse;font-family:Arial,sans-serif">
        <tr><td colspan="2" style="padding:3pt 5pt 2pt;text-align:center">
          <p style="margin:0;font-size:7.5pt;font-weight:bold;text-transform:uppercase">${esc(COMPANY)}</p>
          <p style="margin:2pt 0 0;font-size:12pt;font-weight:bold;
             border-bottom:.75pt solid #000;padding-bottom:2pt;letter-spacing:.04em">NHÃN CÂN CHIA MẺ</p>
        </td></tr>
        <tr><td colspan="2" style="padding:2pt 5pt 3pt">
          <table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse">${fieldRows}</table>
        </td></tr>
      </table>`
    }

    let body = ''
    for (let p = 0; p < pages.length; p++) {
      const page = pages[p]
      let rows = ''
      for (let r = 0; r < 4; r++) {
        rows += `<tr>
          <td style="width:9.3cm;height:6.2cm;padding:1.5mm;vertical-align:top">${labelHtml(page[r * 2])}</td>
          <td style="width:9.3cm;height:6.2cm;padding:1.5mm;vertical-align:top">${labelHtml(page[r * 2 + 1])}</td>
        </tr>`
      }
      body += `<table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse">${rows}</table>`
      if (p < pages.length - 1) body += `<br style="mso-special-character:line-break;page-break-before:always">`
    }

    const doc = `﻿<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom>
</w:WordDocument></xml><![endif]-->
<style>
  @page Section1{size:21.0cm 29.7cm;margin:.8cm .8cm .8cm .8cm}
  div.Section1{page:Section1}
  body,p,td{font-family:Arial,sans-serif;color:#000;margin:0}
  table{border-collapse:collapse}
</style></head>
<body><div class="Section1">${body}</div></body></html>`

    const blob = new Blob([doc], { type: 'application/msword' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'nhan-can-chia-me.doc'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const inpStyle = {
    border: '1px solid #dde1e8', borderRadius: 6, padding: '5px 10px',
    fontFamily: 'inherit', fontSize: 13, color: '#1b1d21', outline: 'none',
    minWidth: 140, background: '#fafbfc',
  }

  return (
    <>
      {/* ── Form điền thông tin chung (ẩn khi in) ── */}
      <div className="no-print" style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14,
        background: '#fff', border: '1px solid #dde1e8', borderRadius: 10,
        padding: '12px 18px', marginBottom: 20,
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#1e4570', whiteSpace: 'nowrap' }}>
          Thông tin chung:
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
          Người thực hiện:
          <input style={inpStyle} value={nguoiTH} onChange={e => setNguoiTH(e.target.value)} placeholder="Họ tên..." />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
          Người kiểm tra:
          <input style={inpStyle} value={nguoiKiemTra} onChange={e => setNguoiKiemTra(e.target.value)} placeholder="Họ tên..." />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
          Ngày thực hiện:
          <input style={inpStyle} value={ngayTH} onChange={e => setNgayTH(e.target.value)} placeholder="dd/mm/yyyy" />
        </label>
        <span style={{ fontSize: 12, color: '#6b7178' }}>({items.length} NVL → {pages.length} trang A4)</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleExportWord}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '7px 14px', borderRadius: 8,
            border: '1px solid #cfd3da', background: '#fff', color: '#1b1d21',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
          </svg>
          Xuất Word (.doc)
        </button>
      </div>

      {/* ── Label pages ── */}
      <div className="nhan-stage">
        {pages.map((page, pi) => (
          <div key={pi} className={`nhan-a4${pi < pages.length - 1 ? ' nhan-break' : ''}`}>
            <div className="nhan-grid">
              {Array.from({ length: 8 }, (_, i) => (
                <SingleLabel key={i} row={page[i]} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function AnhImg({ id, style }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    let url = null
    api.get(`/lsx/anh/${id}/data`, { responseType: 'blob' })
      .then(({ data }) => { url = URL.createObjectURL(data); setSrc(url) })
      .catch(() => {})
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [id])
  if (!src) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}><SyncOutlined spin /></div>
  return <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />
}

export default function LenhSanXuatOrderPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { orderId } = useParams()

  const order   = location.state?.order   || {}
  const product = location.state?.product || {}

  // ── Form state ──────────────────────────────────────────────────────────────
  const [header, setHeader] = useState({
    tenSanPham:    order.tenSanPham             || product.tienTrinh   || '',
    maTP:          product.maTp                 || order.maSp          || '',
    soLuongPhaChe: fmtNum(order.soLuongDatHang) || '',
    quyCach:       product.loaiSanPham          || '',
    soDangKy:      '',
    hanDung:       '',
    soLoSanXuat:   order.soLo                   || '',
    ngaySanXuat:   fmtDate(order.ngayPhatLenh)  || '',
    hanSuDung:     '',
    luuY:          order.ghiChu                || '',
    maDonHang:     order.maDonHang              || '',
  })
  const [nvl,   setNvl]   = useState([])
  const [baoBi, setBaoBi] = useState([])

  // ── Ingest state ─────────────────────────────────────────────────────────────
  const [imageFile,    setImageFile]    = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isDragging,   setIsDragging]   = useState(false)
  const [extracting,   setExtracting]   = useState(false)
  const [status,       setStatus]       = useState(null)   // { type: 'ok'|'run'|'err', text }
  const fileInputRef = useRef(null)

  // ── Ảnh state ─────────────────────────────────────────────────────────────────
  const [anhList,      setAnhList]      = useState([])
  const [anhLoading,   setAnhLoading]   = useState(false)
  const [anhSearch,    setAnhSearch]    = useState('')
  const [uploadingAnh, setUploadingAnh] = useState(false)
  const [renamingId,   setRenamingId]   = useState(null)
  const [renameVal,    setRenameVal]    = useState('')
  const [renameSaving, setRenameSaving] = useState(false)

  // ── View mode ─────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState('lenh')  // 'lenh' | 'dinhmuc' | 'nhan' | 'anh'

  // ── Save state ────────────────────────────────────────────────────────────────
  const [saving,     setSaving]     = useState(false)
  const [savedInfo,  setSavedInfo]  = useState(null)   // { updatedAt, updatedBy }
  const [loadingOld, setLoadingOld] = useState(false)

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const setH = (key, val) => setHeader(p => ({ ...p, [key]: val }))

  const normRow = (r = {}) => ({
    maVatTu: r.maVatTu || '', ten: r.ten || '', loNVL: r.loNVL || '',
    dvt: r.dvt || '', tyLe: r.tyLe || '', dm1: r.dm1 || '',
    dmLo: r.dmLo || '', ghiChu: r.ghiChu || '',
  })

  const populateForm = (data) => {
    setHeader(prev => ({
      ...prev,
      tenSanPham:    data.tenSanPham    || prev.tenSanPham,
      maTP:          data.maTP          || prev.maTP,
      soLuongPhaChe: data.soLuongPhaChe || prev.soLuongPhaChe,
      quyCach:       data.quyCach       || prev.quyCach,
      soDangKy:      data.soDangKy      || prev.soDangKy,
      hanDung:       data.hanDung       || prev.hanDung,
      soLoSanXuat:   data.soLoSanXuat   || prev.soLoSanXuat,
      ngaySanXuat:   data.ngaySanXuat   || prev.ngaySanXuat,
      hanSuDung:     data.hanSuDung     || prev.hanSuDung,
      luuY:          data.luuY          || prev.luuY,
    }))
    setNvl(Array.isArray(data.nguyenVatLieu) ? data.nguyenVatLieu.map(normRow) : [])
    setBaoBi(Array.isArray(data.baoBi) ? data.baoBi.map(normRow) : [])
  }

  // ── Load dữ liệu đã lưu khi mở trang ────────────────────────────────────────
  const donHangId = order.id || (orderId ? Number(orderId) : null)

  const loadSaved = useCallback(async () => {
    if (!donHangId) return
    setLoadingOld(true)
    try {
      const { data } = await api.get('/lsx/to-lenh', { params: { donHangId } })
      if (data?.header) {
        setHeader(prev => ({ ...prev, ...data.header }))
        setNvl(Array.isArray(data.nguyenVatLieu) ? data.nguyenVatLieu : [])
        setBaoBi(Array.isArray(data.baoBi) ? data.baoBi : [])
        setSavedInfo({ updatedAt: data.updatedAt, updatedBy: data.updatedBy })
      }
    } catch (err) {
      if (err?.response?.status !== 204) {
        // 204 = chưa có dữ liệu, bỏ qua
      }
    } finally {
      setLoadingOld(false)
    }
  }, [donHangId])

  useEffect(() => { loadSaved() }, [loadSaved])

  // ── Quản lý ảnh ──────────────────────────────────────────────────────────────
  const loadImages = useCallback(async () => {
    if (!donHangId) return
    setAnhLoading(true)
    try {
      const { data } = await api.get('/lsx/anh/by-don-hang', { params: { donHangId } })
      setAnhList(Array.isArray(data) ? data : [])
    } catch {}
    finally { setAnhLoading(false) }
  }, [donHangId])

  useEffect(() => { loadImages() }, [loadImages])

  const uploadAnh = async (file) => {
    if (!donHangId) return
    setUploadingAnh(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/lsx/anh/upload', fd, {
        params: { donHangId, maDonHang: header.maDonHang || '' },
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAnhList(prev => [data, ...prev])
      message.success(`Đã lưu ảnh: ${data.tenFile}`)
    } catch { message.error('Lưu ảnh thất bại') }
    finally { setUploadingAnh(false) }
  }

  const handleRenameAnh = async (id) => {
    if (!renameVal.trim()) return
    setRenameSaving(true)
    try {
      const { data } = await api.patch(`/lsx/anh/${id}/rename`, { tenFile: renameVal.trim() })
      setAnhList(prev => prev.map(a => a.id === id ? { ...a, tenFile: data.tenFile } : a))
      setRenamingId(null)
    } catch { message.error('Đổi tên thất bại') }
    finally { setRenameSaving(false) }
  }

  const handleDeleteAnh = async (id) => {
    try {
      await api.delete(`/lsx/anh/${id}`)
      setAnhList(prev => prev.filter(a => a.id !== id))
      message.success('Đã xoá ảnh')
    } catch { message.error('Xoá thất bại') }
  }

  // ── Lưu tờ lệnh ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!donHangId) {
      message.warning('Không xác định được đơn hàng để lưu')
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post('/lsx/to-lenh', {
        donHangId,
        maBravo: header.maBravo || product.maBravo || '',
        header,
        nguyenVatLieu: nvl,
        baoBi,
      })
      setSavedInfo({ updatedAt: data.updatedAt, updatedBy: data.updatedBy })
      message.success('Đã lưu tờ lệnh sản xuất')
    } catch (err) {
      message.error(err?.response?.data?.error || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  // ── Image loading ─────────────────────────────────────────────────────────────
  const loadImage = (file) => {
    if (!file.type.startsWith('image/')) {
      setStatus({ type: 'err', text: 'Vui lòng chọn file ảnh (.jpg, .png, .webp)' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageFile(file)
      setImagePreview(reader.result)
      setStatus({ type: 'ok', text: 'Đã nạp ảnh — sẵn sàng trích xuất' })
    }
    reader.readAsDataURL(file)
    uploadAnh(file)
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setStatus(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) loadImage(file)
  }

  // ── Extract ───────────────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!imageFile) return
    setExtracting(true)
    setStatus({ type: 'run', text: 'Đang trích xuất…' })
    try {
      const fd = new FormData()
      fd.append('file', imageFile)
      const { data } = await api.post('/lsx/extract', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      populateForm(data)
      setStatus({ type: 'ok', text: 'Trích xuất thành công — vui lòng đối chiếu với ảnh' })
    } catch (err) {
      const msg = err?.response?.data?.error || 'Trích xuất thất bại'
      setStatus({ type: 'err', text: msg })
      message.error(msg)
    } finally {
      setExtracting(false)
    }
  }

  // ── Demo ──────────────────────────────────────────────────────────────────────
  const handleDemo = () => {
    populateForm(DEMO)
    setStatus({ type: 'ok', text: 'Đã nạp dữ liệu mẫu' })
  }

  return (
    <div>
      <style>{`
        .lsx-page { font-family: 'Inter','Segoe UI',sans-serif; font-size: 14px; }

        /* ── Ingest panel ── */
        .lsx-ingest {
          display: grid; grid-template-columns: 1fr 300px; gap: 14px;
          margin-bottom: 20px;
        }
        @media (max-width: 700px) { .lsx-ingest { grid-template-columns: 1fr; } }

        .lsx-panel {
          background: #fff; border: 1px solid #dde1e8;
          border-radius: 10px; padding: 14px;
        }
        .lsx-panel-label {
          font-size: 11px; font-weight: 600; letter-spacing: .06em;
          text-transform: uppercase; color: #6b7178; margin-bottom: 10px;
        }

        .lsx-drop {
          border: 1.5px dashed #b8bdc6; border-radius: 10px;
          background: #fafbfc; min-height: 148px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; text-align: center; padding: 18px; cursor: pointer; color: #6b7178;
          transition: .14s border-color, .14s background;
        }
        .lsx-drop:hover, .lsx-drop.drag {
          border-color: #3b5bdb; background: #eef1fe; color: #3b5bdb;
        }
        .lsx-drop-big { font-size: 13.5px; font-weight: 500; color: #1b1d21; }
        .lsx-drop-small { font-size: 12px; }

        .lsx-preview {
          position: relative; border-radius: 10px; overflow: hidden;
          border: 1px solid #dde1e8; background: #000;
        }
        .lsx-preview img {
          display: block; width: 100%; max-height: 280px; object-fit: contain;
        }
        .lsx-preview-rm {
          position: absolute; top: 8px; right: 8px; width: 28px; height: 28px;
          border-radius: 7px; background: rgba(20,22,26,.78); border: none;
          color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
        }
        .lsx-preview-rm:hover { background: rgba(20,22,26,.95); }

        .lsx-status {
          display: flex; align-items: center; gap: 8px;
          font-size: 12.5px; color: #6b7178; margin-top: 10px; min-height: 18px;
        }
        .lsx-status.ok  { color: #2f9e44; font-weight: 500; }
        .lsx-status.run { color: #3b5bdb; font-weight: 500; }
        .lsx-status.err { color: #e8590c; font-weight: 500; }
        .lsx-spin {
          width: 13px; height: 13px; flex: none;
          border: 2px solid #3b5bdb; border-top-color: transparent;
          border-radius: 50%; animation: lsxSpin .7s linear infinite;
        }
        @keyframes lsxSpin { to { transform: rotate(360deg); } }

        /* ── Sheet ── */
        .lsx-sheet {
          background: #fff; width: 100%; max-width: 960px; margin: 0 auto;
          border: 1px solid #1b1d21;
          box-shadow: 0 6px 28px rgba(20,30,55,.10);
          padding: 26px 30px 30px; color: #1b1d21;
        }
        .lsx-doc-title {
          font-family: Georgia, serif; font-weight: 700; font-size: 22px;
          letter-spacing: .04em; text-align: center; text-transform: uppercase;
          margin: 0 0 6px;
        }
        .lsx-head-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 2px 40px; margin-top: 6px;
        }
        .lsx-fld {
          display: flex; align-items: baseline; gap: 6px;
          padding: 3px 0; font-size: 13px;
        }
        .lsx-fld > .k {
          color: #3a3f47; white-space: nowrap; font-weight: 500;
        }
        .lsx-fld > input {
          flex: 1; border: none; border-bottom: 1px dotted #b4b8bf;
          background: transparent; font-family: inherit;
          font-size: 13px; color: #1b1d21;
          padding: 1px 2px; min-width: 0; outline: none;
        }
        .lsx-fld > input:focus {
          border-bottom-color: #3b5bdb; background: #eef1fe;
        }
        .lsx-fld > input.hand {
          font-style: italic; color: #1f3b8c;
        }

        /* ── Materials table ── */
        table.lsx-tbl {
          width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px;
        }
        table.lsx-tbl th,
        table.lsx-tbl td {
          border: 1px solid #1b1d21; padding: 0; vertical-align: middle;
        }
        table.lsx-tbl thead th {
          background: #f1f2f4; font-weight: 600; font-size: 11px;
          text-align: center; padding: 6px 5px; line-height: 1.25;
        }
        .lsx-section td {
          background: #e9ebef; font-weight: 700; font-size: 12px; padding: 5px 8px;
        }
        .lsx-cell {
          width: 100%; border: none; background: transparent;
          font-family: inherit; font-size: 12px; color: #1b1d21;
          padding: 5px 6px; outline: none;
        }
        .lsx-cell:focus {
          outline: 2px solid #3b5bdb; outline-offset: -2px; background: #eef1fe;
        }
        .lsx-td-maVatTu { width: 80px; }
        .lsx-td-maVatTu .lsx-cell,
        .lsx-td-loNVL   .lsx-cell { font-family: monospace; font-size: 11.5px; }
        .lsx-td-loNVL   { width: 92px; }
        .lsx-td-dvt     { width: 50px; }
        .lsx-td-dvt .lsx-cell { text-align: center; }
        .lsx-td-tyLe    { width: 60px; }
        .lsx-td-tyLe .lsx-cell  { text-align: right; }
        .lsx-td-dm1,
        .lsx-td-dmLo    { width: 110px; }
        .lsx-td-dm1 .lsx-cell,
        .lsx-td-dmLo .lsx-cell  { text-align: right; }
        .lsx-td-ghiChu  { width: 68px; }
        .lsx-td-act     { width: 30px; border: none !important; background: transparent; }

        .lsx-row-x {
          width: 22px; height: 22px; border: none; background: transparent;
          color: #c0c4cb; cursor: pointer; border-radius: 5px;
          display: flex; align-items: center; justify-content: center; margin: 0 auto;
        }
        .lsx-row-x:hover { background: #fde8e8; color: #d9480f; }

        .lsx-add-btn {
          background: transparent; border: none; color: #3b5bdb;
          cursor: pointer; font-size: 12px; padding: 4px 8px;
          border-radius: 4px; display: inline-flex; align-items: center; gap: 5px;
        }
        .lsx-add-btn:hover { background: #eef1fe; }

        /* ── Footer ── */
        .lsx-doc-foot {
          display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px;
        }
        .lsx-doc-foot .date {
          grid-column: 1/-1; text-align: right; font-size: 13px;
          color: #6b7178; font-style: italic; margin-bottom: 4px;
        }
        .lsx-sign { text-align: center; }
        .lsx-sign .role { font-weight: 700; font-size: 13px; margin-bottom: 42px; }
        .lsx-sign .line { border-top: 1px dotted #b4b8bf; width: 75%; margin: 0 auto; }

        /* ── Label sheet ── */
        .nhan-stage { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 0 0 40px; }
        .nhan-a4 {
          width: 210mm; min-height: 297mm; background: #fff;
          box-shadow: 0 6px 30px rgba(20,30,55,.12);
          padding: 8mm;
        }
        .nhan-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: repeat(4, 1fr);
          gap: 4mm;
          height: 279mm;
        }
        .nhan-label {
          border: 1px solid #000;
          padding: 3mm 4mm;
          display: flex; flex-direction: column; overflow: hidden;
          gap: 0;
        }
        .nhan-company {
          font-size: 8px; font-weight: 600; letter-spacing: .03em;
          text-align: center; color: #222; line-height: 1.2; text-transform: uppercase;
        }
        .nhan-title {
          font-size: 13px; font-weight: 700; text-align: center; letter-spacing: .04em;
          margin: 1.5mm 0 2.5mm; padding-bottom: 1.5mm; border-bottom: 1px solid #000;
        }
        .nhan-break { page-break-after: always; }

        /* ── Print ── */
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
          .lsx-sheet { box-shadow: none; max-width: none; width: 100%; }
          .lsx-cell:focus { outline: none; background: transparent; }
          .lsx-td-act { display: none; }
          th.h-act    { display: none; }
        }
      `}</style>
      {(viewMode === 'nhan' || viewMode === 'dinhmuc') && (
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 8mm; }
            .lsx-sheet-wrap { display: none !important; }
            .nhan-a4 { box-shadow: none; padding: 0; width: auto; min-height: auto; }
            .nhan-grid { height: 279mm; }
            .nhan-label { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}</style>
      )}

      <div className="lsx-page">

        {/* ── Toolbar ── */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ background: '#1e4570', color: '#fff', border: 'none', fontWeight: 600 }}
          >
            Quay lại
          </Button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1e4570' }}>Tờ Lệnh Sản Xuất</span>
          {header.maDonHang && (
            <span style={{ color: '#7c3aed', fontWeight: 600, fontSize: 14 }}>— {header.maDonHang}</span>
          )}
          <div style={{ flex: 1 }} />
          {savedInfo?.updatedAt && (
            <Tooltip title={`Lưu lần cuối: ${dayjs(savedInfo.updatedAt).format('DD/MM/YYYY HH:mm')}${savedInfo.updatedBy ? ' bởi ' + savedInfo.updatedBy : ''}`}>
              <span style={{ fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircleOutlined /> Đã lưu
              </span>
            </Tooltip>
          )}
          {/* Tab switcher */}
          <div style={{
            display: 'flex', border: '1px solid #dde1e8', borderRadius: 8, overflow: 'hidden',
          }}>
            {[
              { key: 'lenh',    label: 'Tờ lệnh',           icon: <FileTextOutlined />, color: '#1e4570' },
              { key: 'dinhmuc', label: 'Định mức vật tư',    icon: <TableOutlined />,   color: '#0369a1' },
              { key: 'nhan',    label: 'Nhãn cân chia mẻ',   icon: <TagsOutlined />,    color: '#7c3aed' },
              { key: 'anh',     label: `Ảnh${anhList.length ? ` (${anhList.length})` : ''}`, icon: <PictureOutlined />, color: '#0f766e' },
            ].map(({ key, label, icon, color }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: viewMode === key ? 700 : 500,
                  background: viewMode === key ? color : '#fff',
                  color: viewMode === key ? '#fff' : '#3a3f47',
                  borderRight: key !== 'anh' ? '1px solid #dde1e8' : 'none',
                  transition: '.12s background',
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          <Button
            icon={<SaveOutlined />}
            type="primary"
            loading={saving}
            onClick={handleSave}
            style={{ background: '#1e4570', borderColor: '#1e4570' }}
          >
            Lưu
          </Button>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>In / PDF</Button>
        </div>

        {/* ── Ingest section ── */}
        <div className="lsx-ingest no-print" style={{ display: viewMode !== 'lenh' ? 'none' : undefined }}>
          {/* Drag-drop zone */}
          <div className="lsx-panel">
            <div className="lsx-panel-label">Ảnh lệnh sản xuất</div>

            {imagePreview ? (
              <div className="lsx-preview">
                <img src={imagePreview} alt="Ảnh lệnh sản xuất" />
                <button className="lsx-preview-rm" onClick={clearImage} title="Bỏ ảnh">✕</button>
              </div>
            ) : (
              <div
                className={`lsx-drop${isDragging ? ' drag' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                <div className="lsx-drop-big">Kéo–thả ảnh vào đây</div>
                <div className="lsx-drop-small">hoặc bấm để chọn file (.jpg .png .webp)</div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) loadImage(e.target.files[0]) }}
            />

            {status && (
              <div className={`lsx-status ${status.type}`}>
                {status.type === 'run' && <span className="lsx-spin" />}
                {status.type === 'ok'  && '✓'}
                {status.type === 'err' && '⚠'}
                {status.text}
              </div>
            )}
          </div>

          {/* Extract panel */}
          <div className="lsx-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="lsx-panel-label">Trích xuất</div>

            <button
              style={{
                width: '100%', justifyContent: 'center',
                padding: '9px 14px', borderRadius: 8,
                background: imageFile && !extracting ? '#3b5bdb' : '#c5ccdb',
                border: 'none', color: '#fff',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                cursor: imageFile && !extracting ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: '.12s background',
              }}
              disabled={!imageFile || extracting}
              onClick={handleExtract}
            >
              {extracting
                ? <><span className="lsx-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> Đang trích xuất…</>
                : <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 3v4M3 5h4M6 17v4M4 19h4"/>
                    <path d="M13 3l4 10 8 2-8 4-4 9-4-9-8-4 8-2z"/>
                  </svg>
                  Trích xuất &amp; điền form
                </>
              }
            </button>

            <div style={{ fontSize: 12, color: '#6b7178', lineHeight: 1.55 }}>
              Nạp ảnh tờ lệnh sản xuất rồi nhấn nút để trích xuất tự động bằng Claude AI.<br /><br />
              <strong>Lưu ý:</strong> cần cấu hình <code style={{ background: '#eef0f3', padding: '1px 5px', borderRadius: 4, fontSize: 11.5 }}>app.anthropic.api-key</code> trong <code style={{ background: '#eef0f3', padding: '1px 5px', borderRadius: 4, fontSize: 11.5 }}>application.properties</code>.
            </div>

            <button
              style={{
                width: '100%', padding: '8px 14px', borderRadius: 8,
                background: 'transparent', border: '1px solid #dde1e8',
                color: '#3a3f47', fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', marginTop: 4,
              }}
              onClick={handleDemo}
            >
              Dùng dữ liệu mẫu (từ ảnh demo)
            </button>
          </div>
        </div>

        {/* ── Định mức vật tư ── */}
        {viewMode === 'dinhmuc' && (
          <DinhMucVatTu nvl={nvl} baoBi={baoBi} header={header} onGoNhan={() => setViewMode('nhan')} />
        )}

        {/* ── Nhãn cân chia mẻ ── */}
        {viewMode === 'nhan' && (
          <NhanCanChiaMe nvl={nvl} header={header} />
        )}

        {/* ── Tab Ảnh ── */}
        {viewMode === 'anh' && (
          <div style={{ padding: '16px 20px' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Input
                prefix={<PictureOutlined style={{ color: '#aaa' }} />}
                placeholder="Tìm theo tên file..."
                allowClear
                value={anhSearch}
                onChange={e => setAnhSearch(e.target.value)}
                style={{ width: 260 }}
              />
              <span style={{ color: '#64748b', fontSize: 13 }}>
                {anhList.length} ảnh đã lưu
              </span>
              {uploadingAnh && <span style={{ color: '#0f766e', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><SyncOutlined spin /> Đang lưu ảnh...</span>}
              <div style={{ flex: 1 }} />
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 14px', borderRadius: 6, cursor: 'pointer',
                background: '#0f766e', color: '#fff', fontSize: 13, fontWeight: 500,
              }}>
                <PlusOutlined /> Thêm ảnh
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) { loadImage(e.target.files[0]); e.target.value = '' } }} />
              </label>
            </div>

            {/* Gallery grid */}
            {anhLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : anhList.filter(a => !anhSearch || a.tenFile?.toLowerCase().includes(anhSearch.toLowerCase())).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
                <PictureOutlined style={{ fontSize: 40, display: 'block', marginBottom: 10 }} />
                {anhList.length === 0 ? 'Chưa có ảnh nào. Kéo–thả ảnh vào ô bên trái hoặc nhấn "Thêm ảnh".' : 'Không tìm thấy ảnh phù hợp.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {anhList
                  .filter(a => !anhSearch || a.tenFile?.toLowerCase().includes(anhSearch.toLowerCase()))
                  .map(anh => (
                    <div key={anh.id} style={{
                      border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden',
                      background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                    }}>
                      {/* Thumbnail — click để xem full size */}
                      <div style={{ height: 150, background: '#f8fafc', overflow: 'hidden', cursor: 'zoom-in' }}
                        onClick={() => api.get(`/lsx/anh/${anh.id}/data`, { responseType: 'blob' })
                          .then(({ data: blob }) => { const u = URL.createObjectURL(blob); window.open(u, '_blank') })
                          .catch(() => message.error('Không thể mở ảnh'))
                        }
                      >
                        <AnhImg id={anh.id} />
                      </div>

                      {/* Info + actions */}
                      <div style={{ padding: '8px 10px' }}>
                        {renamingId === anh.id ? (
                          <div style={{ display: 'flex', gap: 5 }}>
                            <Input
                              size="small" autoFocus
                              value={renameVal}
                              onChange={e => setRenameVal(e.target.value)}
                              onPressEnter={() => handleRenameAnh(anh.id)}
                              onKeyDown={e => { if (e.key === 'Escape') setRenamingId(null) }}
                              style={{ flex: 1 }}
                            />
                            <button
                              disabled={renameSaving}
                              onClick={() => handleRenameAnh(anh.id)}
                              style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid #0f766e', background: '#0f766e', color: '#fff', cursor: 'pointer', fontSize: 12 }}
                            >
                              {renameSaving ? '...' : 'OK'}
                            </button>
                            <button onClick={() => setRenamingId(null)}
                              style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 12 }}>✕</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={anh.tenFile}>{anh.tenFile}</span>
                            <Tooltip title="Đổi tên">
                              <button onClick={() => { setRenamingId(anh.id); setRenameVal(anh.tenFile) }}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#0369a1', padding: 3, borderRadius: 4 }}>
                                <EditOutlined />
                              </button>
                            </Tooltip>
                            <Popconfirm title="Xoá ảnh này?" okText="Xoá" cancelText="Huỷ" okType="danger"
                              onConfirm={() => handleDeleteAnh(anh.id)}>
                              <Tooltip title="Xoá">
                                <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', padding: 3, borderRadius: 4 }}>
                                  <DeleteOutlined />
                                </button>
                              </Tooltip>
                            </Popconfirm>
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                          {anh.uploadedAt ? new Date(anh.uploadedAt).toLocaleString('vi-VN') : ''}
                          {anh.uploadedBy && ` · ${anh.uploadedBy}`}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── Sheet ── */}
        <div className="lsx-sheet-wrap" style={{ display: viewMode !== 'lenh' ? 'none' : 'flex', justifyContent: 'center' }}>
          <div className="lsx-sheet">

            <div className="lsx-doc-title">Lệnh Sản Xuất</div>

            <div className="lsx-head-grid">
              {/* Cột trái */}
              <div>
                {[
                  { k: 'Tên sản phẩm:', f: 'tenSanPham' },
                  { k: 'Mã TP:',         f: 'maTP'        },
                  { k: 'Số lượng pha chế:', f: 'soLuongPhaChe' },
                  { k: 'Mã đơn hàng:',   f: 'maDonHang', hand: true },
                  { k: 'Số lô sản xuất:', f: 'soLoSanXuat', hand: true },
                  { k: 'Ngày sản xuất:', f: 'ngaySanXuat', hand: true },
                  { k: 'Hạn sử dụng:',  f: 'hanSuDung',  hand: true },
                  { k: 'Lưu ý:',        f: 'luuY',       hand: true },
                ].map(({ k, f, hand }) => (
                  <div className="lsx-fld" key={f}>
                    <span className="k">{k}</span>
                    <input
                      className={hand ? 'hand' : undefined}
                      value={header[f] ?? ''}
                      onChange={e => setH(f, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              {/* Cột phải */}
              <div>
                {[
                  { k: 'Quy cách:',   f: 'quyCach'  },
                  { k: 'Số đăng ký:', f: 'soDangKy' },
                  { k: 'Hạn dùng:',  f: 'hanDung'  },
                ].map(({ k, f }) => (
                  <div className="lsx-fld" key={f}>
                    <span className="k">{k}</span>
                    <input value={header[f] ?? ''} onChange={e => setH(f, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Materials table */}
            <table className="lsx-tbl">
              <thead>
                <tr>
                  <th style={{ width: 34 }}>Stt</th>
                  <th style={{ width: 80 }}>Mã vật tư</th>
                  <th>Nguyên liệu / Phụ liệu</th>
                  <th style={{ width: 92 }}>Lô NVL + NCC</th>
                  <th style={{ width: 50 }}>Đvt</th>
                  <th style={{ width: 60 }}>Tỷ lệ (%)</th>
                  <th style={{ width: 110 }}>ĐM 1 ĐVSP</th>
                  <th style={{ width: 110 }}>ĐM theo lô</th>
                  <th style={{ width: 68 }}>Ghi chú</th>
                  <th className="h-act no-print" style={{ width: 30, border: 'none' }}></th>
                </tr>
              </thead>
              <MaterialTable rows={nvl}   setRows={setNvl}   sectionLabel="Nguyên vật liệu" startStt={1} />
              <MaterialTable rows={baoBi} setRows={setBaoBi} sectionLabel="Bao bì"           startStt={1} />
            </table>

            {/* Footer */}
            <div className="lsx-doc-foot">
              <div className="date">Ngày ..... Tháng ..... Năm .........</div>
              <div className="lsx-sign">
                <div className="role">Phòng kế hoạch</div>
                <div className="line"></div>
              </div>
              <div className="lsx-sign">
                <div className="role">Phân xưởng</div>
                <div className="line"></div>
              </div>
            </div>

            <div style={{ marginTop: 14, fontSize: 11.5, color: '#6b7178' }}>Trang 1</div>
          </div>
        </div>
      </div>
    </div>
  )
}
