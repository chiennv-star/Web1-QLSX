import React, { useState, useEffect, useMemo } from 'react'
import { Select, Spin } from 'antd'
import api from '../api/axios'

let _cached = null
let _loading = false
let _callbacks = []

function normalize(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function warmPhongSanXuatCache() {
  if (_cached || _loading) return
  _loading = true
  api.get('/phong-san-xuat')
    .then(r => {
      _cached = r.data
      _loading = false
      _callbacks.forEach(cb => cb(r.data))
      _callbacks = []
    })
    .catch(() => { _loading = false })
}

export default function PhongSanXuatSelect({ value, onChange, disabled, size, style, placeholder, open, autoFocus, defaultValue, onBlur }) {
  const [options, setOptions] = useState(_cached || [])
  const [loading, setLoading] = useState(!_cached)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (_cached) { setOptions(_cached); setLoading(false); return }
    setLoading(true)
    if (_loading) {
      _callbacks.push(data => { setOptions(data); setLoading(false) })
      return
    }
    _loading = true
    api.get('/phong-san-xuat')
      .then(r => {
        _cached = r.data
        _loading = false
        setOptions(r.data)
        setLoading(false)
        _callbacks.forEach(cb => cb(r.data))
        _callbacks = []
      })
      .catch(() => { _loading = false; setLoading(false) })
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
      notFoundContent={
        loading
          ? <Spin size="small" style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }} />
          : <span style={{ color: '#aaa', fontSize: 12 }}>Không tìm thấy</span>
      }
    />
  )
}

export function invalidatePhongSanXuatCache() {
  _cached = null
}
