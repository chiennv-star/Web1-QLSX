import React, { useState, useEffect, useMemo } from 'react'
import { Select } from 'antd'
import api from '../api/axios'

let _cached = null

function normalize(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export default function PhongSanXuatSelect({ value, onChange, disabled, size, style, placeholder, open, autoFocus, defaultValue, onBlur }) {
  const [options, setOptions] = useState(_cached || [])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (_cached) return
    api.get('/phong-san-xuat')
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
      defaultValue={defaultValue}
      onChange={v => { onChange?.(v || null); setSearch('') }}
      disabled={disabled}
      size={size}
      style={style}
      placeholder={placeholder || 'Chọn phòng SX...'}
      showSearch
      allowClear
      filterOption={false}
      onSearch={setSearch}
      onBlur={() => { setSearch(''); onBlur?.() }}
      options={selectOptions}
      open={open}
      autoFocus={autoFocus}
      popupMatchSelectWidth={false}
      dropdownStyle={{ minWidth: 220 }}
      notFoundContent={<span style={{ color: '#aaa', fontSize: 12 }}>Không tìm thấy</span>}
    />
  )
}

export function invalidatePhongSanXuatCache() {
  _cached = null
}
