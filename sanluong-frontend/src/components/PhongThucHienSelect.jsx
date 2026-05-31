import React, { useState, useEffect, useMemo } from 'react'
import { Select } from 'antd'
import api from '../api/axios'

const FALLBACK = [
  'Pha chế 01', 'Pha chế 02', 'Pha chế 03', 'Pha chế 04',
  'Pha chế 05', 'Pha chế 06', 'Pha chế 07', 'Pha chế 08',
  'Khu A', 'Khu B', 'Khu C',
  'Phòng sạch', 'Phòng bán sạch',
  'BBC1', 'Đóng gói',
]

let _cached = null

function normalize(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export default function PhongThucHienSelect({ value, onChange, disabled, size, style, placeholder }) {
  const [options, setOptions] = useState(_cached || FALLBACK.map(t => ({ id: null, ten: t })))
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (_cached) return
    api.get('/phong-thuc-hien')
      .then(r => {
        _cached = r.data
        setOptions(r.data)
      })
      .catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    if (!search) return options
    const q = normalize(search)
    return options.filter(o => normalize(o.ten).includes(q))
  }, [options, search])

  const selectOptions = filtered.map(o => ({ label: o.ten, value: o.ten }))

  return (
    <Select
      value={value || undefined}
      onChange={v => { onChange?.(v || null); setSearch('') }}
      disabled={disabled}
      size={size}
      style={style}
      placeholder={placeholder || 'Chọn phòng thực hiện...'}
      showSearch
      allowClear
      filterOption={false}
      onSearch={setSearch}
      onBlur={() => setSearch('')}
      options={selectOptions}
      notFoundContent={<span style={{ color: '#aaa', fontSize: 12 }}>Không tìm thấy</span>}
    />
  )
}

/** Xóa cache để component tải lại từ API sau khi admin cập nhật danh sách */
export function invalidatePhongCache() {
  _cached = null
}
