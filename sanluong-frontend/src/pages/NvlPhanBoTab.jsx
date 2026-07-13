import React, { useState, useCallback, useMemo } from 'react'
import {
  Upload, Button, Table, Tabs, Tag, Alert, Spin, Space,
  Typography, Row, Col, Tooltip,
} from 'antd'
import {
  InboxOutlined, DownloadOutlined, CheckCircleOutlined,
  WarningOutlined, ReloadOutlined, FileExcelOutlined,
  DatabaseOutlined, UnorderedListOutlined, BarChartOutlined,
} from '@ant-design/icons'
import * as XLSX from 'xlsx'

const { Dragger } = Upload
const { Text } = Typography

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
}

function parseViNumber(val) {
  if (val == null || val === '') return null
  if (typeof val === 'number') return isNaN(val) ? null : val
  if (val instanceof Date) return null
  // Remove thousands separators (.) then normalize decimal (,→.)
  const s = String(val).trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function fmtN(v) {
  if (v == null || (typeof v === 'number' && isNaN(v))) return '—'
  return Number(v).toLocaleString('vi-VN')
}

function cleanKey(val) {
  return String(val ?? '').trim().toLowerCase()
}

// ── Constants ─────────────────────────────────────────────────────────────────

const UNLIMITED_CODES = new Set(['309084'])
const UNLIMITED_NAME_KW = ['nuoc tinh khiet']
const HEADER_KW = ['ma', 'ten', 'so luong', 'dinh muc', 'ton', 'lenh']
const LSX_PRIORITY_LABELS = { 2: '1 - Đơn hàng', 1: '2 - T-', 0: '3 - Dự trữ' }

// ── File parsing ──────────────────────────────────────────────────────────────

function findHeaderRowIdx(rawRows, maxScan = 12) {
  for (let i = 0; i < Math.min(maxScan, rawRows.length); i++) {
    const row = rawRows[i] || []
    const nonEmpty = row.filter(v => v != null && String(v).trim() !== '').length
    if (nonEmpty >= 2) {
      const hasKw = row.some(v => {
        const n = normalize(v)
        return HEADER_KW.some(k => n.includes(k))
      })
      if (hasKw) return i
    }
  }
  return 0
}

async function parseUploadedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array', raw: false, cellDates: false })
        const ws = wb.Sheets[wb.SheetNames[0]]

        // Read raw (array mode) to detect header row
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false })
        const hIdx = findHeaderRowIdx(rawRows)

        const headerRow = rawRows[hIdx] || []
        const headers = headerRow.map((h, i) =>
          h != null && String(h).trim() ? String(h).trim() : `__col${i}__`
        )

        const dataRows = []
        for (let i = hIdx + 1; i < rawRows.length; i++) {
          const row = rawRows[i] || []
          const obj = {}
          headers.forEach((h, j) => { obj[h] = row[j] ?? null })
          dataRows.push(obj)
        }

        resolve({ headers, rows: dataRows })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ── Column detection ──────────────────────────────────────────────────────────

function detectCol(headers, keywords) {
  for (const h of headers) {
    const n = normalize(h)
    if (keywords.some(k => n.includes(normalize(k)))) return h
  }
  return null
}

// ── Domain logic ──────────────────────────────────────────────────────────────

function isUnlimited(code, name) {
  const c = cleanKey(code)
  const n = normalize(name)
  return UNLIMITED_CODES.has(c) || UNLIMITED_NAME_KW.some(k => n.includes(k))
}

function classifyLsxPriority(lsx) {
  const s = normalize(lsx)
  if (!s.startsWith('t-')) return 2          // Regular orders — highest
  if (s.includes('du tru')) return 0          // Reserve — lowest
  return 1                                    // T- orders — medium
}

function extractOrderQty(lsx) {
  const matches = [...String(lsx || '').matchAll(/(\d[\d.,]*)/g)]
  for (let i = matches.length - 1; i >= 0; i--) {
    const n = parseViNumber(matches[i][1])
    if (n && n >= 100) return n
  }
  return null
}

// ── Allocation algorithm ──────────────────────────────────────────────────────
// Order-centric greedy: maximises the number of orders fully completed (100% NVL).
// Each priority tier is processed separately (higher priority first).
//   Round 1: for each order (fewest materials first), allocate 100% if all available.
//   Round 2: allocate leftover stock to partially-satisfied orders (smallest demand first per material).

function allocateStock(demands, stockPool) {
  const result = demands.map(d => ({ ...d, tonKhoPhanBo: 0 }))

  // Unlimited materials → always fully met
  for (const d of result) {
    if (d.isUnlimited) d.tonKhoPhanBo = d.tongNhuCau
  }

  const normalDemands = result.filter(d => !d.isUnlimited && d.tongNhuCau > 0)
  const tiers = [...new Set(normalDemands.map(d => d.mucUuTienLsx))].sort((a, b) => b - a)

  for (const tier of tiers) {
    const tierD = normalDemands.filter(d => d.mucUuTienLsx === tier)

    // Group by order
    const byLenh = new Map()
    for (const d of tierD) {
      if (!byLenh.has(d.KEY_SAN_PHAM)) byLenh.set(d.KEY_SAN_PHAM, [])
      byLenh.get(d.KEY_SAN_PHAM).push(d)
    }

    // Sort: orders needing fewest material types first
    const lenhList = [...byLenh.entries()].sort((a, b) => a[1].length - b[1].length)
    const notDone = new Set()

    // Round 1: all-or-nothing per order
    for (const [lenh, rows] of lenhList) {
      const canFull = rows.every(r => (stockPool[r.KEY_NVL] ?? 0) >= r.tongNhuCau - 1e-9)
      if (canFull) {
        for (const r of rows) {
          r.tonKhoPhanBo = r.tongNhuCau
          stockPool[r.KEY_NVL] = (stockPool[r.KEY_NVL] ?? 0) - r.tongNhuCau
        }
      } else {
        notDone.add(lenh)
      }
    }

    // Round 2: allocate remaining stock for incomplete orders, per material, smallest demand first
    const rem = tierD.filter(d => notDone.has(d.KEY_SAN_PHAM))
    const byNvl = new Map()
    for (const d of rem) {
      if (!byNvl.has(d.KEY_NVL)) byNvl.set(d.KEY_NVL, [])
      byNvl.get(d.KEY_NVL).push(d)
    }
    for (const [nvlId, group] of byNvl) {
      let stock = stockPool[nvlId] ?? 0
      if (stock <= 0) continue
      group.sort((a, b) => a.tongNhuCau - b.tongNhuCau)
      for (const r of group) {
        const cap = Math.min(r.tongNhuCau, stock)
        r.tonKhoPhanBo = cap
        stock -= cap
        if (stock <= 0) break
      }
      stockPool[nvlId] = stock
    }
  }

  return result
}

// ── Main data processor ───────────────────────────────────────────────────────

function processFileData({ headers, rows }) {
  const colMa    = detectCol(headers, ['mã vật tư', 'mã nvl', 'mã hàng'])
  const colTen   = detectCol(headers, ['tên vật tư', 'tên nvl'])
  const colLsx   = detectCol(headers, ['lệnh sản xuất'])
  const colSlLsx = detectCol(headers, ['số lượng lsx'])
  const colTon   = detectCol(headers, ['tồn kho'])
  const colDaXuat = detectCol(headers, ['đã xuất'])
  const colSlMua  = detectCol(headers, ['số lượng mua', 'sl mua'])

  const missing = []
  if (!colMa) missing.push('Mã vật tư')
  if (!colTen) missing.push('Tên vật tư')
  if (!colLsx) missing.push('Lệnh sản xuất')
  if (!colSlLsx) missing.push('Số lượng LSX')
  if (!colTon) missing.push('Tồn kho')
  if (missing.length > 0) {
    return { error: `Không nhận diện được cột: ${missing.join(', ')}. Kiểm tra lại file gốc.` }
  }

  // Separate parent rows (no LSX → true stock source) from child rows
  const stockFromParent = {}
  const childRows = []

  for (const row of rows) {
    const lsxRaw = row[colLsx]
    const lsxStr = String(lsxRaw ?? '').trim()
    if (!lsxStr || lsxStr.toLowerCase() === 'nan') {
      // Parent row: extract material code from "CODE - Name" in ten column (most accurate)
      let key = cleanKey(row[colMa])
      const tenRaw = row[colTen]
      if (tenRaw) {
        const m = String(tenRaw).match(/^\s*(\S+)\s*-\s*/)
        if (m) key = m[1].trim().toLowerCase()
      }
      const ton = parseViNumber(row[colTon])
      if (key && ton != null) stockFromParent[key] = ton
    } else {
      // Filter out comment/footer rows that have no valid numbers at all
      if (parseViNumber(row[colSlLsx]) == null && parseViNumber(row[colTon]) == null) continue
      childRows.push(row)
    }
  }

  // Build demand rows
  const demands = []
  const stockFromChild = {}

  for (const row of childRows) {
    const key = cleanKey(row[colMa])
    if (!key || key === 'nan') continue
    const lsx = String(row[colLsx] || '').trim()
    if (!lsx) continue

    const tenNvl  = String(row[colTen] || '').trim()
    const slLsx   = parseViNumber(row[colSlLsx]) ?? 0
    const ton     = parseViNumber(row[colTon]) ?? 0
    const daXuat  = colDaXuat ? (parseViNumber(row[colDaXuat]) ?? 0) : 0
    const slMua   = colSlMua  ? (parseViNumber(row[colSlMua])  ?? 0) : 0
    const tongNhuCau = Math.max(0, slLsx - daXuat)

    if (!(key in stockFromChild) || ton > stockFromChild[key]) stockFromChild[key] = ton

    demands.push({
      KEY_NVL: key,
      KEY_SAN_PHAM: lsx,
      tenNvl,
      slLsx,
      daXuat,
      slMua,
      tongNhuCau,
      mucUuTienLsx: classifyLsxPriority(lsx),
      isUnlimited: isUnlimited(key, tenNvl),
    })
  }

  if (demands.length === 0) {
    return { error: 'Không có dữ liệu hợp lệ trong file. Kiểm tra cột Lệnh sản xuất và Số lượng LSX.' }
  }

  // Stock pool: parent rows take priority over child rows for accuracy
  const allKeys = new Set([...Object.keys(stockFromParent), ...Object.keys(stockFromChild)])
  const stockPool = {}
  for (const k of allKeys) stockPool[k] = stockFromParent[k] ?? stockFromChild[k] ?? 0
  const stockPoolOrig = { ...stockPool }

  // Run allocation
  const allocated = allocateStock(demands, stockPool)

  // Compute shortage (BBC2 materials: 2% tolerance before counting as missing)
  for (const d of allocated) {
    const shortage = d.tonKhoPhanBo - d.tongNhuCau
    const isBbc2 = String(d.KEY_NVL).startsWith('5')
    const withinTol = isBbc2 && d.tongNhuCau > 0 && d.tonKhoPhanBo >= d.tongNhuCau * 0.98
    d.thieu = (shortage < -1e-6 && !withinTol) ? shortage : 0
  }

  // ── Tab 1: Tổng Hợp Vật Tư ───────────────────────────────────────────────
  const thMap = {}
  for (const d of allocated) {
    const k = d.KEY_NVL
    if (!thMap[k]) {
      thMap[k] = { key: k, maNvl: k.toUpperCase(), tenNvl: d.tenNvl,
        tongNhuCau: 0, tonGoc: stockPoolOrig[k] ?? 0, slMua: 0, isUnlimited: d.isUnlimited }
    }
    thMap[k].tongNhuCau += d.tongNhuCau
    if (d.slMua > thMap[k].slMua) thMap[k].slMua = d.slMua
  }
  const tongHopRows = Object.values(thMap).map(v => ({
    ...v,
    canDoi: v.isUnlimited ? 0 : (v.tonGoc - v.tongNhuCau),
  })).sort((a, b) => b.tongNhuCau - a.tongNhuCau)

  // ── Tab 2: Phân Bổ Chi Tiết ──────────────────────────────────────────────
  const phanBoRows = allocated.map((d, i) => ({
    key: `${d.KEY_SAN_PHAM}_${d.KEY_NVL}_${i}`,
    nhomUuTien: LSX_PRIORITY_LABELS[d.mucUuTienLsx] || '',
    lsx: d.KEY_SAN_PHAM,
    maNvl: d.KEY_NVL.toUpperCase(),
    tenNvl: d.tenNvl,
    slLsx: d.slLsx,
    daXuat: d.daXuat,
    tongNhuCau: d.tongNhuCau,
    tonKhoTT: stockPoolOrig[d.KEY_NVL] ?? 0,
    tonKhoPhanBo: d.tonKhoPhanBo,
    thieu: d.thieu,
    slMua: d.slMua,
  })).sort((a, b) =>
    a.nhomUuTien.localeCompare(b.nhomUuTien) ||
    a.lsx.localeCompare(b.lsx) ||
    a.maNvl.localeCompare(b.maNvl)
  )

  // ── Tab 3: Kế Hoạch SX Khả Thi ──────────────────────────────────────────
  const lsxMap = {}
  for (const d of allocated) {
    if (!lsxMap[d.KEY_SAN_PHAM]) {
      lsxMap[d.KEY_SAN_PHAM] = {
        lsx: d.KEY_SAN_PHAM,
        nhomUuTien: LSX_PRIORITY_LABELS[d.mucUuTienLsx] || '',
        mucUuTienLsx: d.mucUuTienLsx,
        soNvlCan: 0,
        nvlThieu: [],
        tyLeDapUngMin: 1,
        soNvlMua: 0,
      }
    }
    const e = lsxMap[d.KEY_SAN_PHAM]
    if (!d.isUnlimited) {
      e.soNvlCan++
      if (d.thieu < -1e-6) e.nvlThieu.push(d.KEY_NVL.toUpperCase())
      if (d.tongNhuCau > 0) {
        const ratio = Math.min(1, d.tonKhoPhanBo / d.tongNhuCau)
        if (ratio < e.tyLeDapUngMin) e.tyLeDapUngMin = ratio
      }
      if (d.slMua > 0) e.soNvlMua++
    }
  }

  const khsxRows = Object.values(lsxMap).map(v => {
    const qty = extractOrderQty(v.lsx)
    const pct = Math.round(v.tyLeDapUngMin * 100)
    return {
      key: v.lsx,
      ...v,
      soNvlThieu: v.nvlThieu.length,
      trangThai: v.nvlThieu.length === 0 ? 'OK' : 'Thiếu',
      nvlThieuText: v.nvlThieu.slice(0, 8).join(', ') + (v.nvlThieu.length > 8 ? '...' : ''),
      slDonHang: qty,
      slCoTheLam: qty != null ? Math.round(qty * v.tyLeDapUngMin) : null,
      pctDapUng: pct,
    }
  }).sort((a, b) =>
    a.nhomUuTien.localeCompare(b.nhomUuTien) ||
    a.soNvlThieu - b.soNvlThieu ||
    a.lsx.localeCompare(b.lsx)
  )

  const soDuDu = khsxRows.filter(r => r.trangThai === 'OK').length

  return { tongHopRows, phanBoRows, khsxRows, soDuDu, totalLsx: khsxRows.length }
}

// ── Excel export ──────────────────────────────────────────────────────────────

function exportToExcel(tongHopRows, phanBoRows, khsxRows) {
  const wb = XLSX.utils.book_new()

  const sh1 = XLSX.utils.aoa_to_sheet([
    ['Mã NVL', 'Tên Nguyên Vật Liệu', 'Tồn Kho Gốc', 'Tổng Nhu Cầu', 'Cân Đối (Thiếu âm / Dư dương)', 'SL Mua'],
    ...tongHopRows.map(r => [r.maNvl, r.tenNvl, r.tonGoc, r.tongNhuCau, r.canDoi, r.slMua || 0]),
  ])
  XLSX.utils.book_append_sheet(wb, sh1, 'Tổng Hợp Vật Tư')

  const sh2 = XLSX.utils.aoa_to_sheet([
    ['Nhóm ưu tiên', 'Lệnh SX', 'Mã NVL', 'Tên NVL', 'SL LSX', 'Đã xuất', 'Nhu cầu còn', 'Tồn kho TT', 'Phân bổ', 'Thiếu hụt', 'SL Mua'],
    ...phanBoRows.map(r => [r.nhomUuTien, r.lsx, r.maNvl, r.tenNvl, r.slLsx, r.daXuat, r.tongNhuCau, r.tonKhoTT, r.tonKhoPhanBo, r.thieu || 0, r.slMua || 0]),
  ])
  XLSX.utils.book_append_sheet(wb, sh2, 'Phân Bổ Chi Tiết')

  const sh3 = XLSX.utils.aoa_to_sheet([
    ['Nhóm ưu tiên', 'Lệnh SX', 'SL Đơn hàng', 'SL Có thể làm', '% Đáp ứng', 'Số NVL cần', 'Số NVL thiếu', 'Đang đặt mua', 'Trạng thái', 'NVL thiếu (mã)'],
    ...khsxRows.map(r => [
      r.nhomUuTien, r.lsx, r.slDonHang ?? '', r.slCoTheLam ?? '',
      `${r.pctDapUng}%`, r.soNvlCan, r.soNvlThieu, r.soNvlMua, r.trangThai, r.nvlThieuText,
    ]),
  ])
  XLSX.utils.book_append_sheet(wb, sh3, 'Kế Hoạch SX Khả Thi')

  XLSX.writeFile(wb, `phan-bo-nvl-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NvlPhanBoTab() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState(null)

  const handleFile = useCallback(async (file) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setFileName(file.name)
    try {
      const parsed = await parseUploadedFile(file)
      const res = processFileData(parsed)
      if (res.error) setError(res.error)
      else setResult(res)
    } catch (err) {
      setError(`Lỗi đọc file: ${err.message}`)
    } finally {
      setLoading(false)
    }
    return false // Prevent antd auto-upload
  }, [])

  const reset = useCallback(() => { setResult(null); setError(null); setFileName(null) }, [])

  // ── Column definitions ──────────────────────────────────────────────────────

  const cols1 = useMemo(() => [
    {
      title: 'Mã NVL', dataIndex: 'maNvl', key: 'maNvl', width: 110, fixed: 'left',
      render: v => <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{v}</span>,
    },
    {
      title: 'Tên Nguyên Vật Liệu', dataIndex: 'tenNvl', key: 'tenNvl', ellipsis: true, minWidth: 200,
    },
    {
      title: 'Tồn Kho Gốc', dataIndex: 'tonGoc', key: 'tonGoc', width: 115, align: 'right',
      render: v => fmtN(v),
    },
    {
      title: 'Nhu Cầu SX', dataIndex: 'tongNhuCau', key: 'tongNhuCau', width: 115, align: 'right',
      render: v => fmtN(v),
    },
    {
      title: 'Cân Đối', dataIndex: 'canDoi', key: 'canDoi', width: 115, align: 'right',
      sorter: (a, b) => a.canDoi - b.canDoi,
      render: v => {
        if (v === 0) return <span style={{ color: '#16a34a', fontWeight: 600 }}>Đủ</span>
        if (v < 0) return <span style={{ color: '#dc2626', fontWeight: 700 }}>{fmtN(v)}</span>
        return <span style={{ color: '#2563eb' }}>+{fmtN(v)}</span>
      },
    },
    {
      title: 'SL Mua', dataIndex: 'slMua', key: 'slMua', width: 100, align: 'right',
      render: v => v > 0 ? <span style={{ color: '#7c3aed', fontWeight: 600 }}>{fmtN(v)}</span> : '—',
    },
  ], [])

  const cols2 = useMemo(() => [
    {
      title: 'Nhóm UT', dataIndex: 'nhomUuTien', key: 'nhomUuTien', width: 110, fixed: 'left',
      render: v => (
        <Tag color={v?.startsWith('1') ? 'blue' : v?.startsWith('2') ? 'orange' : 'default'} style={{ fontSize: 11 }}>
          {v}
        </Tag>
      ),
    },
    { title: 'Lệnh SX', dataIndex: 'lsx', key: 'lsx', width: 210, ellipsis: true, fixed: 'left' },
    {
      title: 'Mã NVL', dataIndex: 'maNvl', key: 'maNvl', width: 100,
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>,
    },
    { title: 'Tên NVL', dataIndex: 'tenNvl', key: 'tenNvl', ellipsis: true, minWidth: 150 },
    { title: 'SL LSX', dataIndex: 'slLsx', key: 'slLsx', width: 90, align: 'right', render: v => fmtN(v) },
    {
      title: 'Đã xuất', dataIndex: 'daXuat', key: 'daXuat', width: 80, align: 'right',
      render: v => v > 0 ? fmtN(v) : '—',
    },
    {
      title: 'Nhu cầu còn', dataIndex: 'tongNhuCau', key: 'tongNhuCau', width: 105, align: 'right',
      render: v => <b>{fmtN(v)}</b>,
    },
    { title: 'Tồn kho TT', dataIndex: 'tonKhoTT', key: 'tonKhoTT', width: 105, align: 'right', render: v => fmtN(v) },
    {
      title: 'Phân bổ', dataIndex: 'tonKhoPhanBo', key: 'tonKhoPhanBo', width: 90, align: 'right',
      render: (v, r) => (
        <span style={{ color: r.thieu < 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
          {fmtN(v)}
        </span>
      ),
    },
    {
      title: 'Thiếu hụt', dataIndex: 'thieu', key: 'thieu', width: 90, align: 'right',
      render: v => v < 0
        ? <span style={{ color: '#dc2626', fontWeight: 700 }}>{fmtN(v)}</span>
        : '—',
    },
    {
      title: 'SL Mua', dataIndex: 'slMua', key: 'slMua', width: 80, align: 'right',
      render: v => v > 0 ? <span style={{ color: '#7c3aed' }}>{fmtN(v)}</span> : '—',
    },
  ], [])

  const cols3 = useMemo(() => [
    {
      title: 'Nhóm UT', dataIndex: 'nhomUuTien', key: 'nhomUuTien', width: 110, fixed: 'left',
      render: v => (
        <Tag color={v?.startsWith('1') ? 'blue' : v?.startsWith('2') ? 'orange' : 'default'} style={{ fontSize: 11 }}>
          {v}
        </Tag>
      ),
    },
    { title: 'Lệnh Sản Xuất', dataIndex: 'lsx', key: 'lsx', width: 240, fixed: 'left', ellipsis: true },
    {
      title: 'SL Đơn Hàng', dataIndex: 'slDonHang', key: 'slDonHang', width: 110, align: 'right',
      render: v => v ? fmtN(v) : '—',
    },
    {
      title: 'SL Có Thể Làm', dataIndex: 'slCoTheLam', key: 'slCoTheLam', width: 120, align: 'right',
      render: v => v != null ? <b>{fmtN(v)}</b> : '—',
    },
    {
      title: '% Đáp Ứng', dataIndex: 'pctDapUng', key: 'pctDapUng', width: 100, align: 'center',
      sorter: (a, b) => a.pctDapUng - b.pctDapUng,
      render: v => (
        <span style={{
          color: v >= 100 ? '#16a34a' : v >= 80 ? '#f59e0b' : '#dc2626',
          fontWeight: 700,
        }}>
          {v}%
        </span>
      ),
    },
    {
      title: 'NVL Cần', dataIndex: 'soNvlCan', key: 'soNvlCan', width: 75, align: 'center',
    },
    {
      title: 'NVL Thiếu', dataIndex: 'soNvlThieu', key: 'soNvlThieu', width: 85, align: 'center',
      sorter: (a, b) => a.soNvlThieu - b.soNvlThieu,
      render: v => v > 0
        ? <span style={{ color: '#dc2626', fontWeight: 700 }}>{v}</span>
        : <span style={{ color: '#16a34a' }}>0</span>,
    },
    {
      title: 'Đang Mua', dataIndex: 'soNvlMua', key: 'soNvlMua', width: 80, align: 'center',
      render: v => v > 0 ? <span style={{ color: '#7c3aed' }}>{v}</span> : '—',
    },
    {
      title: 'Trạng Thái', dataIndex: 'trangThai', key: 'trangThai', width: 110, align: 'center', fixed: 'right',
      filters: [{ text: 'Đủ 100%', value: 'OK' }, { text: 'Thiếu NVL', value: 'Thiếu' }],
      onFilter: (value, record) => record.trangThai === value,
      render: v => v === 'OK'
        ? <Tag icon={<CheckCircleOutlined />} color="success">Đủ 100%</Tag>
        : <Tag icon={<WarningOutlined />} color="error">Thiếu NVL</Tag>,
    },
    {
      title: 'NVL Thiếu (mã)', dataIndex: 'nvlThieuText', key: 'nvlThieuText', ellipsis: true, minWidth: 160,
      render: v => v ? <span style={{ color: '#dc2626', fontSize: 12, fontFamily: 'monospace' }}>{v}</span> : '—',
    },
  ], [])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '8px 0' }}>
      <style>{`
        .nvl-row-thieu td { background: #fff5f5 !important; }
        .nvl-row-thieu:hover td { background: #fee2e2 !important; }
      `}</style>

      {/* Upload section (shown when no result) */}
      {!result && !loading && (
        <div style={{ maxWidth: 680, margin: '24px auto' }}>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
            message="Phân bổ NVL từ Báo cáo cân đối vật tư"
            description={
              <span>
                Tải lên file <b>Báo cáo cân đối vật tư</b> (Excel/CSV) từ phần mềm Bravo.
                Hệ thống tự nhận diện cột và phân bổ tồn kho để tối đa số lệnh SX đủ 100% NVL.
              </span>
            }
          />
          <Dragger
            accept=".xlsx,.xls,.csv"
            beforeUpload={handleFile}
            showUploadList={false}
          >
            <p style={{ fontSize: 48, margin: '8px 0 4px', color: '#0369a1' }}>
              <InboxOutlined />
            </p>
            <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>
              Kéo thả hoặc bấm để chọn file
            </p>
            <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>
              Hỗ trợ .xlsx, .xls, .csv — tự nhận diện tiêu đề cột
            </p>
          </Dragger>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#64748b' }}>Đang phân tích và phân bổ NVL…</div>
        </div>
      )}

      {error && (
        <Alert
          type="error"
          showIcon
          message="Lỗi xử lý file"
          description={error}
          style={{ marginBottom: 16, maxWidth: 700 }}
          action={<Button size="small" onClick={reset}>Thử lại</Button>}
        />
      )}

      {result && (
        <>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <Space size={10}>
              <FileExcelOutlined style={{ color: '#16a34a', fontSize: 16 }} />
              <Text strong style={{ fontSize: 13 }}>{fileName}</Text>
              <Tag color={result.soDuDu === result.totalLsx ? 'success' : 'warning'}>
                {result.soDuDu}/{result.totalLsx} lệnh đủ 100%
              </Tag>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={reset} size="small">Tải file khác</Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="small"
                onClick={() => exportToExcel(result.tongHopRows, result.phanBoRows, result.khsxRows)}
              >
                Xuất Excel
              </Button>
            </Space>
          </div>

          {/* Summary stat cards */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {[
              { label: 'Tổng lệnh SX', value: result.totalLsx, bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
              { label: 'Đủ 100% NVL', value: result.soDuDu, bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
              { label: 'Còn thiếu NVL', value: result.totalLsx - result.soDuDu, bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
              { label: 'Tổng loại NVL', value: result.tongHopRows.length, bg: '#fdf4ff', border: '#e9d5ff', color: '#7c3aed' },
            ].map(({ label, value, bg, border, color }) => (
              <Col xs={12} sm={6} key={label}>
                <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
                </div>
              </Col>
            ))}
          </Row>

          {/* Result tabs */}
          <Tabs
            defaultActiveKey="kh-sx"
            size="small"
            items={[
              {
                key: 'kh-sx',
                label: (
                  <span>
                    <CheckCircleOutlined style={{ marginRight: 4 }} />
                    Kế Hoạch SX Khả Thi
                  </span>
                ),
                children: (
                  <Table
                    dataSource={result.khsxRows}
                    columns={cols3}
                    size="small"
                    scroll={{ x: 1300 }}
                    pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
                    rowClassName={r => r.trangThai !== 'OK' ? 'nvl-row-thieu' : ''}
                  />
                ),
              },
              {
                key: 'tong-hop',
                label: (
                  <span>
                    <BarChartOutlined style={{ marginRight: 4 }} />
                    Tổng Hợp NVL
                    {result.tongHopRows.filter(r => r.canDoi < 0).length > 0 && (
                      <span style={{ marginLeft: 4, color: '#dc2626', fontWeight: 700 }}>
                        ({result.tongHopRows.filter(r => r.canDoi < 0).length} thiếu)
                      </span>
                    )}
                  </span>
                ),
                children: (
                  <Table
                    dataSource={result.tongHopRows}
                    columns={cols1}
                    size="small"
                    scroll={{ x: 700 }}
                    pagination={{ pageSize: 100, showSizeChanger: true, pageSizeOptions: ['50', '100', '200'] }}
                    rowClassName={r => r.canDoi < -1e-6 ? 'nvl-row-thieu' : ''}
                  />
                ),
              },
              {
                key: 'phan-bo',
                label: (
                  <span>
                    <UnorderedListOutlined style={{ marginRight: 4 }} />
                    Phân Bổ Chi Tiết ({result.phanBoRows.length})
                  </span>
                ),
                children: (
                  <Table
                    dataSource={result.phanBoRows}
                    columns={cols2}
                    size="small"
                    scroll={{ x: 1200 }}
                    pagination={{ pageSize: 100, showSizeChanger: true, pageSizeOptions: ['50', '100', '200', '500'] }}
                    rowClassName={r => r.thieu < -1e-6 ? 'nvl-row-thieu' : ''}
                  />
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  )
}
