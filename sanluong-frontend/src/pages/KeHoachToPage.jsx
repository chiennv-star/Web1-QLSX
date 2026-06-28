import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Select, Spin, message, DatePicker, Tooltip, Button, Popconfirm, Input, Dropdown } from 'antd'
import { ReloadOutlined, TeamOutlined, ProjectOutlined, WarningOutlined, LeftOutlined, RightOutlined, SearchOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

dayjs.extend(isoWeek)

const { Option } = Select
const SHIFTS  = ['Ca 1', 'Ca 2', 'Ca 3', 'HC']
const DOW     = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const CA_STYLE = {
  'Ca 1': { bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
  'Ca 2': { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  'Ca 3': { bg: '#fdf4ff', border: '#e9d5ff', text: '#7c3aed' },
  'HC':   { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
}

const CA_TO_SESSION   = { 'Ca 1': 'Ca 1', 'Ca 2': 'Ca 2', 'Ca 3': 'Ca 3', 'HC': 'HC' }
// Backward compat: 'Hành Chính' từ dữ liệu cũ → 'HC'
const CA_FROM_SESSION = { 'Ca 1': 'Ca 1', 'Ca 2': 'Ca 2', 'Ca 3': 'Ca 3', 'HC': 'HC', 'Hành Chính': 'HC' }

const SS_TO        = 'kehoachto_selectedTo'
const SS_WEEK      = 'kehoachto_weekStart'
const SS_SOURCE    = 'kehoachto_planSource'
const SS_TIME_MODE = 'kehoachto_timeMode'
const SS_MONTH     = 'kehoachto_monthStart'
const SS_ASSIGNS   = 'kehoachto_assigns'
const SS_P1_OPEN   = 'kehoachto_p1Open'
const SS_P2_OPEN   = 'kehoachto_p2Open'

const TIME_MODES = [
  { key: 'week',  label: 'Tuần'   },
  { key: 'month', label: 'Tháng'  },
  { key: 'all',   label: 'Tất cả' },
]

const PLAN_SOURCES = [
  { key: 'PLAN',     label: 'Kế hoạch' },
  { key: 'SCHEDULE', label: 'Lịch SX'  },
]

const TO_TABS = [
  { key: 'BBC1',     label: 'BBC1',     schedCongDoan: 'BBC1'  },
  { key: 'Cân Chia', label: 'Cân Chia', congDoanKey: 'CC', schedCongDoan: 'CC'   },
  { key: 'PCPL1',    label: 'PCPL1',    schedCongDoan: 'PCPL1' },
  { key: 'PCPL2',    label: 'PCPL2',    schedCongDoan: 'PCPL2' },
  { key: 'PCPL3',    label: 'PL',       schedCongDoan: 'PL'    },
  { key: 'ĐG',       label: 'ĐG',       schedCongDoan: 'DG'    },
]

// ── Migration: old format (ca/mas/sessionIds) → new format (caShifts) ────────
function migrateAssign(a) {
  if (a.caShifts) return a
  const { ca, mas, sessionIds, caStart, caEnd, ...rest } = a
  let shiftKey = ca || 'Ca 1'
  if (shiftKey === 'Hành Chính') shiftKey = 'HC'
  if (!SHIFTS.includes(shiftKey)) shiftKey = 'Ca 1'
  return {
    ...rest,
    caShifts: { [shiftKey]: { mas: mas || [], sessionIds: sessionIds || {} } },
  }
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/)
  return ((parts[parts.length - 2] || '')[0] || '').toUpperCase() +
         ((parts[parts.length - 1] || '')[0] || '').toUpperCase()
}
function fmtDay(d) { return dayjs(d).format('DD/MM') }
function dowOf(d)  { return DOW[dayjs(d).day()] }

// ── AssignCard ────────────────────────────────────────────────────────────────
function AssignCard({
  a, employees, dup,
  onDragOver, onDropPerson, onRemovePerson, onUpdate, onRemove,
  isFirst, isLast, onMoveUp, onMoveDown, onClone,
  onDragStartPersonMove, onSyncNote, onAddShift, onRemoveShift,
  readOnly,
}) {
  const existingShifts  = SHIFTS.filter(s => a.caShifts?.[s])
  const availableShifts = SHIFTS.filter(s => !a.caShifts?.[s])

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      background: '#fff',
      borderRadius: 10, padding: '9px 10px',
      marginBottom: 7,
    }}>
      {/* ── Top row: info + note + controls ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
        {/* Info */}
        <div style={{ flex: '1 1 150px', minWidth: 140 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', lineHeight: 1.3 }}>
            {a.ten}
          </div>
          <div style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {a.maSp && <span>{a.maSp}</span>}
            {a.maDonHang && <span style={{ color: '#818cf8' }}>ĐH {a.maDonHang}</span>}
            {a.soLo && (
              <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>
                Lô {a.soLo}
              </span>
            )}
            {a.coLo && (
              <span style={{ color: '#475569' }}>SL {Number(a.coLo).toLocaleString('vi-VN')}</span>
            )}
            {a.salgSessionId && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span style={{ color: '#059669', fontWeight: 700 }}>Salg</span>
                <input
                  type="number"
                  value={a.salg ?? ''}
                  readOnly={readOnly}
                  onChange={readOnly ? undefined : e => onUpdate(a.id, 'salg', e.target.value === '' ? null : Number(e.target.value))}
                  onClick={e => e.stopPropagation()}
                  placeholder="—"
                  style={{
                    width: 72, fontSize: 11, borderRadius: 4, padding: '1px 5px',
                    fontFamily: 'monospace', outline: 'none',
                    border: readOnly ? '1px solid transparent' : '1px solid #6ee7b7',
                    color: readOnly ? '#64748b' : '#065f46',
                    background: readOnly ? 'transparent' : '#ecfdf5',
                    cursor: readOnly ? 'default' : undefined,
                  }}
                />
              </span>
            )}
          </div>
          <div style={{ marginTop: 3, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {a.toNhom && (
              <span style={{ fontSize: 10, fontWeight: 800, background: '#ccfbf1', color: '#0f766e', borderRadius: 4, padding: '1px 6px' }}>
                {a.toNhom}
              </span>
            )}
            {a.congDoan && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', borderRadius: 4, padding: '1px 6px' }}>
                {a.congDoan}
              </span>
            )}
            {a.isUrgent && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#fef2f2', color: '#dc2626', borderRadius: 4, padding: '1px 6px' }}>
                ⚠ Gấp
              </span>
            )}
          </div>
        </div>

        {/* Note */}
        <input
          value={a.note || ''}
          placeholder={readOnly ? '' : 'Ghi chú...'}
          readOnly={readOnly}
          onChange={readOnly ? undefined : e => onUpdate(a.id, 'note', e.target.value)}
          onBlur={readOnly ? undefined : e => onSyncNote(a.id, e.target.value)}
          style={{
            flex: '1 1 110px', minWidth: 100,
            border: readOnly ? '1px solid transparent' : '1px solid #e2e8f0', borderRadius: 8,
            padding: '5px 8px', fontSize: 12, color: '#334155', outline: 'none',
            cursor: readOnly ? 'default' : undefined,
            background: readOnly ? 'transparent' : undefined,
          }}
        />

        {/* Move + Clone + Delete */}
        {!readOnly && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Tooltip title="Lên trên">
              <button onClick={onMoveUp} disabled={isFirst}
                style={{ border: 'none', background: 'transparent', cursor: isFirst ? 'default' : 'pointer', color: isFirst ? '#e2e8f0' : '#94a3b8', fontSize: 14, padding: '1px 4px', borderRadius: 4, lineHeight: 1 }}>↑</button>
            </Tooltip>
            <Tooltip title="Xuống dưới">
              <button onClick={onMoveDown} disabled={isLast}
                style={{ border: 'none', background: 'transparent', cursor: isLast ? 'default' : 'pointer', color: isLast ? '#e2e8f0' : '#94a3b8', fontSize: 14, padding: '1px 4px', borderRadius: 4, lineHeight: 1 }}>↓</button>
            </Tooltip>
            <Tooltip title="Nhân bản">
              <span onClick={() => onClone(a.id)}
                style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 14, marginTop: 2, userSelect: 'none' }}>⧉</span>
            </Tooltip>
            <Popconfirm title="Xóa card này?" okText="Xóa" cancelText="Huỷ" okButtonProps={{ danger: true, size: 'small' }} onConfirm={() => onRemove(a.id)}>
              <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1', fontSize: 15, marginTop: 2, padding: 0, lineHeight: 1 }}>🗑</button>
            </Popconfirm>
          </div>
        )}
      </div>

      {/* ── Ca sections ── */}
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {existingShifts.map(caKey => {
          const shiftData = a.caShifts[caKey] || { mas: [], sessionIds: {} }
          const cs = CA_STYLE[caKey] || CA_STYLE['Ca 1']
          const isEmpty = (shiftData.mas || []).length === 0
          return (
            <div key={caKey} style={{
              border: `1px solid ${cs.border}`,
              background: cs.bg,
              borderRadius: 8, padding: '5px 8px',
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            }}>
              {/* Ca badge */}
              <span style={{
                fontSize: 10.5, fontWeight: 800,
                background: cs.border, color: cs.text,
                borderRadius: 6, padding: '2px 9px', flexShrink: 0,
              }}>{caKey}</span>

              {/* Drop zone */}
              <div
                onDragOver={readOnly ? undefined : onDragOver}
                onDrop={readOnly ? undefined : e => onDropPerson(e, a.id, caKey)}
                onDragEnter={readOnly ? undefined : e => { e.preventDefault(); e.currentTarget.style.borderColor = '#6366f1' }}
                onDragLeave={readOnly ? undefined : e => { e.currentTarget.style.borderColor = 'transparent' }}
                style={{
                  display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
                  flex: '2 1 180px', minWidth: 150,
                  border: '2px dashed transparent', borderRadius: 8, padding: '2px 4px',
                  transition: 'border-color 0.15s',
                }}
              >
                {(shiftData.mas || []).map(ma => {
                  const emp        = employees.find(e => e.maNhanVien === ma)
                  const isConflict = dup.has(`${ma}|${a.ngay}|${caKey}`)
                  return (
                    <span key={ma} draggable={!readOnly} onDragStart={readOnly ? undefined : e => onDragStartPersonMove(e, ma, a.id, caKey)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: isConflict ? '#fef2f2' : '#eef2ff',
                        border: `1px solid ${isConflict ? '#fca5a5' : '#c7d2fe'}`,
                        color: isConflict ? '#b91c1c' : '#3730a3',
                        borderRadius: 999, padding: '2px 5px 2px 3px', fontSize: 11.5, fontWeight: 700,
                        cursor: readOnly ? 'default' : 'grab',
                      }}
                    >
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        background: isConflict ? '#fecaca' : '#c7d2fe',
                        color: isConflict ? '#b91c1c' : '#4338ca',
                        fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {initials(emp?.hoVaTen || ma)}
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                        <span>{emp?.hoVaTen || ma}</span>
                        {(shiftData.sessionIds?.[ma]?.vaiTro || shiftData.sessionIds?.[ma]?.congThucHien != null) && (
                          <span style={{ fontSize: 9, color: isConflict ? '#b91c1c' : '#6366f1', opacity: 0.8, whiteSpace: 'nowrap' }}>
                            {shiftData.sessionIds[ma].vaiTro && <span>{shiftData.sessionIds[ma].vaiTro}</span>}
                            {shiftData.sessionIds[ma].congThucHien != null && (
                              <span style={{ marginLeft: shiftData.sessionIds[ma].vaiTro ? 4 : 0, color: '#059669', fontWeight: 700 }}>
                                {shiftData.sessionIds[ma].congThucHien}c
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                      {!readOnly && (
                        <Popconfirm
                          title={`Xóa "${emp?.hoVaTen || ma}" khỏi ${caKey}?`}
                          okText="Xóa" cancelText="Huỷ"
                          okButtonProps={{ danger: true, size: 'small' }}
                          onConfirm={e => { e?.stopPropagation(); onRemovePerson(a.id, ma, caKey) }}
                        >
                          <span
                            style={{ cursor: 'pointer', marginLeft: 1, fontSize: 11, color: isConflict ? '#b91c1c' : '#6366f1', opacity: 0.7, lineHeight: 1, display: 'flex', alignItems: 'center' }}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => e.stopPropagation()}
                          >✕</span>
                        </Popconfirm>
                      )}
                    </span>
                  )
                })}
                {!readOnly && (
                  <span style={{ border: '1.5px dashed #cbd5e1', borderRadius: 999, padding: '2px 8px', fontSize: 10.5, color: '#94a3b8', userSelect: 'none' }}>
                    ⤵ kéo người
                  </span>
                )}
              </div>

              {/* Remove shift (only when empty and editing) */}
              {!readOnly && isEmpty && (
                <Tooltip title={`Xóa ca ${caKey}`}>
                  <button onClick={() => onRemoveShift(a.id, caKey)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1', fontSize: 13, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>✕</button>
                </Tooltip>
              )}
            </div>
          )
        })}

        {/* Add shift */}
        {!readOnly && availableShifts.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
            {availableShifts.map(caKey => {
              const cs = CA_STYLE[caKey] || CA_STYLE['Ca 1']
              return (
                <button key={caKey} onClick={() => onAddShift(a.id, caKey)}
                  style={{
                    border: `1.5px dashed ${cs.border}`,
                    background: 'transparent', cursor: 'pointer',
                    color: cs.text, borderRadius: 6,
                    padding: '2px 10px', fontSize: 10.5, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}
                >
                  <PlusOutlined style={{ fontSize: 9 }} /> {caKey}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── AssignRow — horizontal table-row variant of AssignCard ──────────────────
function AssignRow({
  a, employees, dup,
  onDragOver, onDropPerson, onRemovePerson, onUpdate, onRemove,
  isFirst, isLast, onMoveUp, onMoveDown, onClone,
  onDragStartPersonMove, onSyncNote, onAddShift, onRemoveShift,
  readOnly,
}) {
  const existingShifts  = SHIFTS.filter(s => a.caShifts?.[s])
  const availableShifts = SHIFTS.filter(s => !a.caShifts?.[s])
  const allMas = Object.values(a.caShifts || {}).flatMap(s => s.mas || [])
  const status = a.isUrgent
    ? { text: '⚠ Gấp',    bg: '#fef2f2', color: '#dc2626' }
    : allMas.length > 0
      ? { text: '✓ Đã xếp', bg: '#dcfce7', color: '#15803d' }
      : { text: '⏳ Chưa xếp', bg: '#fff3cd', color: '#856404' }

  const td = { padding: '9px 11px', verticalAlign: 'middle', borderRight: '1px solid #f0f4f8', borderBottom: '1px solid #f0f4f8' }

  return (
    <tr style={{ background: a.isUrgent ? '#fff8f8' : '#fff' }}>
      {/* Sản phẩm */}
      <td style={{ ...td, minWidth: 200, maxWidth: 280 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: a.isUrgent ? '#b91c1c' : '#1e293b', lineHeight: 1.35 }}>
          {a.ten}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 3, alignItems: 'center' }}>
          {a.maSp && <span style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>{a.maSp}</span>}
          {a.maDonHang && <span style={{ fontSize: 10.5, color: '#818cf8' }}>ĐH {a.maDonHang}</span>}
          {a.soLo && <span style={{ fontSize: 10.5, background: '#ede9fe', color: '#6d28d9', borderRadius: 4, padding: '0 5px' }}>Lô {a.soLo}</span>}
          {a.coLo && <span style={{ fontSize: 10.5, color: '#475569' }}>{Number(a.coLo).toLocaleString('vi-VN')} Salg</span>}
        </div>
        {a.salgSessionId && (
          <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10.5, color: '#059669', fontWeight: 700 }}>SL:</span>
            <input type="number" value={a.salg ?? ''} readOnly={readOnly}
              onChange={readOnly ? undefined : e => onUpdate(a.id, 'salg', e.target.value === '' ? null : Number(e.target.value))}
              onClick={e => e.stopPropagation()} placeholder="—"
              style={{ width: 70, fontSize: 11, border: readOnly ? '1px solid transparent' : '1px solid #6ee7b7', borderRadius: 4, padding: '1px 5px', background: readOnly ? 'transparent' : '#ecfdf5', color: '#065f46', outline: 'none', cursor: readOnly ? 'default' : undefined }} />
          </div>
        )}
      </td>

      {/* Công đoạn */}
      <td style={{ ...td, textAlign: 'center', width: 88 }}>
        <span style={{ display: 'inline-block', background: '#e3f2fd', color: '#1565c0', padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
          {a.congDoan || a.toNhom || '—'}
        </span>
        {a.isUrgent && <div style={{ marginTop: 3 }}><span style={{ fontSize: 9.5, background: '#fef2f2', color: '#dc2626', borderRadius: 4, padding: '1px 5px' }}>⚠ Gấp</span></div>}
      </td>

      {/* Người thực hiện */}
      <td style={{ ...td, minWidth: 380 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {existingShifts.map(caKey => {
            const shiftData = a.caShifts[caKey] || { mas: [], sessionIds: {} }
            const cs        = CA_STYLE[caKey] || CA_STYLE['Ca 1']
            const isEmpty   = (shiftData.mas || []).length === 0
            return (
              <React.Fragment key={caKey}>
                <span style={{ fontSize: 10, fontWeight: 800, background: cs.bg, color: cs.text, border: `1px solid ${cs.border}`, borderRadius: 5, padding: '3px 8px', flexShrink: 0 }}>{caKey}</span>
                <div
                  onDragOver={readOnly ? undefined : onDragOver}
                  onDrop={readOnly ? undefined : e => onDropPerson(e, a.id, caKey)}
                  onDragEnter={readOnly ? undefined : e => { e.preventDefault(); e.currentTarget.style.outline = '2px dashed #6366f1' }}
                  onDragLeave={readOnly ? undefined : e => { e.currentTarget.style.outline = 'none' }}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center', borderRadius: 8, padding: 2, transition: 'outline 0.1s' }}
                >
                  {(shiftData.mas || []).map(ma => {
                    const emp        = employees.find(e => e.maNhanVien === ma)
                    const isConflict = dup.has(`${ma}|${a.ngay}|${caKey}`)
                    return (
                      <div key={ma} draggable={!readOnly} onDragStart={readOnly ? undefined : e => onDragStartPersonMove(e, ma, a.id, caKey)}
                        style={{ background: isConflict ? '#fef2f2' : '#fff8e1', border: `1px solid ${isConflict ? '#fca5a5' : '#ffd54f'}`, borderRadius: 6, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 5, cursor: readOnly ? 'default' : 'grab', whiteSpace: 'nowrap' }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: isConflict ? '#fecaca' : '#f59e0b', color: isConflict ? '#b91c1c' : '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {initials(emp?.hoVaTen || ma)}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: isConflict ? '#b91c1c' : '#1a1a1a' }}>{emp?.hoVaTen || ma}</span>
                        {(shiftData.sessionIds?.[ma]?.congThucHien != null) && (
                          <span style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>{shiftData.sessionIds[ma].congThucHien}c</span>
                        )}
                        {!readOnly && (
                          <Popconfirm title={`Xóa "${emp?.hoVaTen || ma}" khỏi ${caKey}?`} okText="Xóa" cancelText="Huỷ" okButtonProps={{ danger: true, size: 'small' }} onConfirm={e => { e?.stopPropagation(); onRemovePerson(a.id, ma, caKey) }}>
                            <span style={{ cursor: 'pointer', fontSize: 11, color: '#94a3b8', lineHeight: 1 }} onClick={e => e.stopPropagation()}>✕</span>
                          </Popconfirm>
                        )}
                      </div>
                    )
                  })}
                  {!readOnly && (
                    <span style={{ border: '1.5px dashed #cbd5e1', borderRadius: 999, padding: '3px 10px', fontSize: 10, color: '#94a3b8', userSelect: 'none' }}>⤵</span>
                  )}
                  {!readOnly && isEmpty && existingShifts.length > 1 && (
                    <Tooltip title={`Xóa ca ${caKey}`}>
                      <button onClick={() => onRemoveShift(a.id, caKey)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1', fontSize: 12, lineHeight: 1 }}>✕</button>
                    </Tooltip>
                  )}
                </div>
              </React.Fragment>
            )
          })}
          {!readOnly && availableShifts.map(caKey => {
            const cs = CA_STYLE[caKey] || CA_STYLE['Ca 1']
            return (
              <button key={caKey} onClick={() => onAddShift(a.id, caKey)}
                style={{ border: `1.5px dashed ${cs.border}`, background: 'transparent', cursor: 'pointer', color: cs.text, borderRadius: 6, padding: '3px 9px', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                <PlusOutlined style={{ fontSize: 9 }} /> {caKey}
              </button>
            )
          })}
        </div>
        {(a.note || !readOnly) && (
          <input value={a.note || ''} readOnly={readOnly}
            onChange={readOnly ? undefined : e => onUpdate(a.id, 'note', e.target.value)}
            onBlur={readOnly ? undefined : e => onSyncNote(a.id, e.target.value)}
            placeholder={readOnly ? '' : 'Ghi chú...'}
            style={{ marginTop: 5, width: '100%', maxWidth: 420, border: readOnly ? '1px solid transparent' : '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#64748b', background: readOnly ? 'transparent' : undefined, outline: 'none', cursor: readOnly ? 'default' : undefined }} />
        )}
      </td>

      {/* Tình trạng */}
      <td style={{ ...td, textAlign: 'center', width: 112, borderRight: 'none' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 600, background: status.bg, color: status.color, whiteSpace: 'nowrap' }}>
          {status.text}
        </span>
      </td>

      {/* Actions — only in edit mode */}
      {!readOnly && (
        <td style={{ padding: '6px 8px', verticalAlign: 'middle', textAlign: 'center', width: 60, borderBottom: '1px solid #f0f4f8', borderLeft: '1px solid #f0f4f8' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <button onClick={onMoveUp} disabled={isFirst} style={{ border: 'none', background: 'transparent', cursor: isFirst ? 'default' : 'pointer', color: isFirst ? '#e2e8f0' : '#94a3b8', fontSize: 14, padding: '2px 6px', lineHeight: 1 }}>↑</button>
            <button onClick={onMoveDown} disabled={isLast} style={{ border: 'none', background: 'transparent', cursor: isLast ? 'default' : 'pointer', color: isLast ? '#e2e8f0' : '#94a3b8', fontSize: 14, padding: '2px 6px', lineHeight: 1 }}>↓</button>
            <Tooltip title="Nhân bản">
              <span onClick={() => onClone(a.id)} style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 13, userSelect: 'none' }}>⧉</span>
            </Tooltip>
            <Popconfirm title="Xóa card này?" okText="Xóa" cancelText="Huỷ" okButtonProps={{ danger: true, size: 'small' }} onConfirm={() => onRemove(a.id)}>
              <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1', fontSize: 14, padding: 0, lineHeight: 1 }}>🗑</button>
            </Popconfirm>
          </div>
        </td>
      )}
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function KeHoachToPage() {
  const { user } = useAuth()

  const visibleTabs = (() => {
    const role = user?.role
    if (role === 'ADMIN_PCPL1') return TO_TABS.filter(t => ['PCPL1', 'PCPL3'].includes(t.key))
    if (role === 'ADMIN_PCPL2') return TO_TABS.filter(t => t.key === 'PCPL2')
    if (role === 'ADMIN_PCPL3') return TO_TABS.filter(t => t.key === 'PCPL3')
    if (role === 'ADMIN_BBC1')  return TO_TABS.filter(t => t.key === 'BBC1')
    if (role === 'ADMIN_DG')    return TO_TABS.filter(t => t.key === 'ĐG')
    return TO_TABS
  })()

  const [selectedTo, setSelectedToState] = useState(() => sessionStorage.getItem(SS_TO) || '')
  const [weekStart, setWeekStartState]   = useState(() => {
    const saved = sessionStorage.getItem(SS_WEEK)
    return saved ? dayjs(saved).startOf('isoWeek') : dayjs().startOf('isoWeek')
  })
  const [planSource, setPlanSourceState] = useState(
    () => sessionStorage.getItem(SS_SOURCE) || 'PLAN'
  )
  const [timeMode, setTimeModeState] = useState(
    () => sessionStorage.getItem(SS_TIME_MODE) || 'week'
  )
  const [monthStart, setMonthStartState] = useState(() => {
    const saved = sessionStorage.getItem(SS_MONTH)
    return saved ? dayjs(saved).startOf('month') : dayjs().startOf('month')
  })

  function setSelectedTo(v) { sessionStorage.setItem(SS_TO, v || ''); setSelectedToState(v) }
  function setWeekStart(v)  { sessionStorage.setItem(SS_WEEK, v.format('YYYY-MM-DD')); setWeekStartState(v) }
  function setPlanSource(v) { sessionStorage.setItem(SS_SOURCE, v); setPlanSourceState(v) }
  function setTimeMode(v)   { sessionStorage.setItem(SS_TIME_MODE, v); setTimeModeState(v) }
  function setMonthStart(v) { sessionStorage.setItem(SS_MONTH, v.format('YYYY-MM-DD')); setMonthStartState(v) }

  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'))

  const [plans, setPlans]         = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading]     = useState(false)

  const [filterDay, setFilterDay]         = useState('')
  const [searchProduct, setSearchProduct] = useState('')

  const uidRef = useRef((() => {
    try {
      const saved = sessionStorage.getItem(SS_ASSIGNS)
      if (!saved) return 1
      const parsed = JSON.parse(saved)
      const allIds = Object.values(parsed).flat().map(a => a.id || 0)
      return allIds.length > 0 ? Math.max(...allIds) + 1 : 1
    } catch { return 1 }
  })())

  const [assignsByTo, setAssignsByTo] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SS_ASSIGNS)
      if (!saved) return {}
      const parsed = JSON.parse(saved)
      Object.keys(parsed).forEach(key => {
        if (Array.isArray(parsed[key])) {
          parsed[key] = parsed[key].map(migrateAssign)
        }
      })
      return parsed
    } catch { return {} }
  })

  const assigns = (selectedTo ? assignsByTo[selectedTo] : null) || []
  function setAssigns(updater) {
    if (!selectedTo) return
    setAssignsByTo(prev => {
      const cur  = prev[selectedTo] || []
      const next = typeof updater === 'function' ? updater(cur) : updater
      return { ...prev, [selectedTo]: next }
    })
  }

  useEffect(() => {
    try { sessionStorage.setItem(SS_ASSIGNS, JSON.stringify(assignsByTo)) } catch {}
  }, [assignsByTo])

  const [selectedDay, setSelectedDay] = useState(() => fmtDay(dayjs()))
  const [viewMode, setViewMode]       = useState('viec')
  const [detailSearch, setDetailSearch] = useState('')
  const [showAllDays, setShowAllDays]   = useState(false)
  const [editingDays, setEditingDays]   = useState(new Set())
  const [empTo, setEmpTo] = useState(selectedTo)
  useEffect(() => { setEmpTo(selectedTo) }, [selectedTo])

  const dragKind    = useRef(null)
  const dragPayload = useRef(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page: 0, size: 2000, source: 'SCHEDULE' }
      if (planSource === 'SCHEDULE') params.isPlanned = false
      if (timeMode === 'week') {
        params.fromDate = weekStart.format('YYYY-MM-DD')
        params.toDate   = weekStart.add(6, 'day').format('YYYY-MM-DD')
      } else if (timeMode === 'month') {
        params.fromDate = monthStart.startOf('month').format('YYYY-MM-DD')
        params.toDate   = monthStart.endOf('month').format('YYYY-MM-DD')
      }
      const { data } = await api.get('/work-schedule', { params })
      const plansList = data?.content || []
      setPlans(plansList)
      return plansList
    } catch {
      message.error('Không thể tải kế hoạch')
      return []
    } finally {
      setLoading(false)
    }
  }, [weekStart, monthStart, timeMode, planSource])

  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await api.get('/employees', { params: { size: 500 } })
      setEmployees((data?.content || []).filter(e => !e.ngayNghiViec))
    } catch {
      message.error('Không thể tải nhân viên')
    }
  }, [])

  const fetchSessionsForWeek = useCallback(async (plansList) => {
    if (!plansList?.length) return
    const fromDate = timeMode === 'week' ? weekStart.format('YYYY-MM-DD') : null
    const toDate   = timeMode === 'week' ? weekStart.add(6, 'day').format('YYYY-MM-DD') : null
    try {
      const wsIds = [...new Set(plansList.map(p => p.id))]
      const sessionParams = planSource === 'SCHEDULE'
        ? (id) => ({ scheduleId: id })
        : (id) => ({ scheduleId: id, loaiSession: 'KH_TO' })
      const results = await Promise.allSettled(
        wsIds.map(id => api.get('/work-schedule-session', { params: sessionParams(id) }))
      )
      const allSessions = results.flatMap(r =>
        r.status === 'fulfilled' ? (r.value.data || []) : []
      ).filter(s => !fromDate || (s.ngay >= fromDate && s.ngay <= toDate))

      if (!allSessions.length) return

      // Group sessions by (wsId, ngay) — 1 card per product per day
      const grouped = {}
      allSessions.forEach(s => {
        const key = `${s.workScheduleId}|${s.ngay}`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(s)
      })

      setAssignsByTo(prev => {
        const updated = { ...prev }

        // Pass 1: rebuild existing assigns' caShifts from backend (source of truth)
        Object.keys(updated).forEach(toKey => {
          updated[toKey] = (updated[toKey] || []).map(assign => {
            if (!assign.wsId || !assign.ngayFull) return assign
            const group = grouped[`${assign.wsId}|${assign.ngayFull}`]
            if (!group?.length) return assign
            // Rebuild from backend — this removes people deleted from work-schedule
            const newCaShifts = {}
            group.forEach(s => {
              const caKey = CA_FROM_SESSION[s.caSanXuat] || s.caSanXuat || 'Ca 1'
              if (!newCaShifts[caKey]) newCaShifts[caKey] = { mas: [], sessionIds: {} }
              if (s.maNhanVien) {
                if (!newCaShifts[caKey].mas.includes(s.maNhanVien)) {
                  newCaShifts[caKey].mas = [...newCaShifts[caKey].mas, s.maNhanVien]
                }
                newCaShifts[caKey].sessionIds = {
                  ...newCaShifts[caKey].sessionIds,
                  [s.maNhanVien]: {
                    id: s.id, locked: s.sanLuong != null,
                    vaiTro: s.vaiTro || null,
                    congThucHien: s.congThucHien ?? null,
                    soGioThucHien: s.soGioThucHien ?? null,
                  },
                }
              }
            })
            // Keep local-only (unsaved, no sessionId) people from existing state
            Object.entries(assign.caShifts || {}).forEach(([caKey, { mas = [], sessionIds = {} }]) => {
              mas.forEach(ma => {
                if (!sessionIds[ma]) {
                  if (!newCaShifts[caKey]) newCaShifts[caKey] = { mas: [], sessionIds: {} }
                  if (!newCaShifts[caKey].mas.includes(ma)) newCaShifts[caKey].mas.push(ma)
                }
              })
            })
            return { ...assign, caShifts: newCaShifts }
          })
        })

        // Pass 2: create new assigns for groups not yet represented
        Object.values(grouped).forEach(group => {
          const first = group[0]
          const plan  = plansList.find(p => p.id === first.workScheduleId)
          if (!plan) return
          const ngay     = dayjs(first.ngay).format('DD/MM')
          const toKeyFromCd = TO_TABS.find(t => t.schedCongDoan === plan.congDoan)?.key
          const toKey    = toKeyFromCd || plan.toNhom || ''
          const existing = (updated[toKey] || []).find(a =>
            a.wsId === first.workScheduleId && a.ngayFull === first.ngay
          )
          if (existing) return

          const caShifts = {}
          group.forEach(s => {
            const caKey = CA_FROM_SESSION[s.caSanXuat] || s.caSanXuat || 'Ca 1'
            if (!caShifts[caKey]) caShifts[caKey] = { mas: [], sessionIds: {} }
            if (s.maNhanVien) {
              if (!caShifts[caKey].mas.includes(s.maNhanVien)) caShifts[caKey].mas.push(s.maNhanVien)
              caShifts[caKey].sessionIds[s.maNhanVien] = {
                id: s.id, locked: s.sanLuong != null,
                vaiTro: s.vaiTro || null,
                congThucHien: s.congThucHien ?? null,
                soGioThucHien: s.soGioThucHien ?? null,
              }
            }
          })

          const newAssign = {
            id:            uidRef.current++,
            wsId:          plan.id,
            ten:           plan.tenTrinh || plan.maBravo || plan.maSp || '(Không tên)',
            maSp:          plan.maSp      || '',
            maBravo:       plan.maBravo   || '',
            maDonHang:     plan.maDonHang || '',
            soLo:          plan.soLo      || '',
            coLo:          plan.coLo      || null,
            salg:          group[0]?.sanLuong ?? null,
            salgSessionId: group[0]?.id ?? null,
            toNhom:        plan.toNhom    || '',
            congDoan:      plan.congDoan  || '',
            isUrgent:      isUrgent(plan),
            ngay,
            ngayFull:      first.ngay,
            caShifts,
            note:          '',
          }
          if (!updated[toKey]) updated[toKey] = []
          updated[toKey] = [...updated[toKey], newAssign]
        })

        return updated
      })
    } catch { /* silent */ }
  }, [weekStart, timeMode, planSource])

  const fetchAll = useCallback(async () => {
    const [plansList] = await Promise.all([fetchPlans(), fetchEmployees()])
    if (plansList) fetchSessionsForWeek(plansList)
  }, [fetchPlans, fetchEmployees, fetchSessionsForWeek])

  useEffect(() => {
    fetchPlans().then(plansList => { if (plansList) fetchSessionsForWeek(plansList) })
  }, [fetchPlans, fetchSessionsForWeek])
  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  useEffect(() => {
    if (visibleTabs.length === 1 && selectedTo !== visibleTabs[0].key) {
      setSelectedTo(visibleTabs[0].key)
    }
  }, [user?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Panel open/close ──────────────────────────────────────────────────────
  const [p1Open, setP1Open] = useState(() => sessionStorage.getItem(SS_P1_OPEN) === 'true')
  const [p2Open, setP2Open] = useState(() => sessionStorage.getItem(SS_P2_OPEN) === 'true')

  // ── Derived ────────────────────────────────────────────────────────────────
  const isUrgent = p => {
    const t = `${p.tenTrinh || ''} ${p.chuY || ''} ${p.saiLech || ''}`.toUpperCase()
    return t.includes('GẤP') || t.includes('GAP')
  }

  const selectedTab = TO_TABS.find(t => t.key === selectedTo)

  const filteredPlans = plans.filter(p => {
    if (searchProduct) {
      const q = searchProduct.toLowerCase()
      const match = (p.tenTrinh || '').toLowerCase().includes(q)
        || (p.maSp || '').toLowerCase().includes(q)
        || (p.soLo || '').toLowerCase().includes(q)
        || (p.maDonHang || '').toLowerCase().includes(q)
      if (!match) return false
    }
    if (selectedTo) {
      if (planSource === 'SCHEDULE') {
        if (p.congDoan !== selectedTab?.schedCongDoan) return false
        if (selectedTo === 'PCPL1' && p.toNhom === 'PCPL2') return false
        if (selectedTo === 'PCPL2' && p.toNhom === 'PCPL1') return false
      } else {
        if (selectedTab?.congDoanKey) {
          if (p.congDoan !== selectedTab.congDoanKey) return false
        } else {
          if (p.toNhom !== selectedTo) return false
        }
      }
    }
    if (filterDay) {
      const d = p.ngayThucHien ? fmtDay(p.ngayThucHien) : ''
      if (d !== filterDay) return false
    }
    return true
  })

  const displayEmps = empTo
    ? (() => {
        const tab = TO_TABS.find(t => t.key === empTo)
        if (tab?.congDoanKey) return employees
        return employees.filter(e => e.toNhom === empTo)
      })()
    : employees

  // ── Conflict detection ─────────────────────────────────────────────────────
  function getConflictSet() {
    const seen = {}, dup = new Set()
    assigns.forEach(a => {
      Object.entries(a.caShifts || {}).forEach(([caKey, shiftData]) => {
        ;(shiftData.mas || []).forEach(m => {
          const k = `${m}|${a.ngay}|${caKey}`
          if (seen[k]) dup.add(k); else seen[k] = true
        })
      })
    })
    return dup
  }
  const dup           = getConflictSet()
  const conflictCount = dup.size

  // ── Save ──────────────────────────────────────────────────────────────────
  const [savingDay, setSavingDay] = useState(null)

  async function handleSaveDay(dayStr) {
    if (!selectedTo) { message.warning('Chọn tổ trước khi lưu'); return }
    const toSave = assigns.filter(a => a.ngay === dayStr && a.wsId && a.ngayFull)
    if (toSave.length === 0) { message.info('Chưa có lịch nào để lưu'); return }

    const wsMap = {}
    toSave.forEach(a => { wsMap[a.wsId] = a.ngayFull })

    const sessionUpsertCalls = []
    toSave.forEach(a => {
      Object.entries(a.caShifts || {}).forEach(([caKey, shiftData]) => {
        const caSession = CA_TO_SESSION[caKey] || caKey
        ;(shiftData.mas || []).forEach(ma => {
          if (shiftData.sessionIds?.[ma]?.id) return
          sessionUpsertCalls.push(
            api.post('/work-schedule-session', {
              workScheduleId: a.wsId,
              ngay:           a.ngayFull,
              maNhanVien:     ma,
              nguoiThucHien:  employees.find(e => e.maNhanVien === ma)?.hoVaTen || ma,
              nhomThucHien:   employees.find(e => e.maNhanVien === ma)?.toNhom || a.toNhom || null,
              caSanXuat:      caSession,
              loaiSession:    'KH_TO',
            }).catch(err => { if (err.response?.status !== 409) throw err })
          )
        })
      })
    })

    const salgCalls = []
    toSave.forEach(a => {
      if (a.salgSessionId && a.salg != null && a.salg !== '') {
        salgCalls.push(
          api.patch(`/work-schedule-session/${a.salgSessionId}/san-luong`, { sanLuong: Number(a.salg) })
        )
      }
    })

    setSavingDay(dayStr)
    try {
      await Promise.all([
        ...Object.entries(wsMap).map(([wsId, ngayFull]) =>
          api.patch(`/work-schedule/${wsId}/ngay-thuc-hien`, { ngayThucHien: ngayFull })
        ),
        ...sessionUpsertCalls,
        ...salgCalls,
      ])
      message.success(`Đã lưu ${Object.keys(wsMap).length} mục cho ngày ${dayStr}`)
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || ''
      message.error(`Lưu thất bại${msg ? ': ' + msg : ' — thử lại'}`)
    } finally {
      setSavingDay(null)
    }
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function onDragStartProduct(e, plan) {
    dragKind.current    = 'product'
    dragPayload.current = plan
    e.dataTransfer.effectAllowed = 'copy'
  }
  function onDragStartPerson(e, emp) {
    dragKind.current    = 'person'
    dragPayload.current = emp
    e.dataTransfer.effectAllowed = 'copy'
  }
  function onDragStartPersonMove(e, ma, fromAssignId, fromCaKey) {
    dragKind.current    = 'personMove'
    dragPayload.current = { ma, fromAssignId, fromCaKey }
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e) { e.preventDefault() }

  function getFullDate(dayStr) {
    const d = days.find(day => fmtDay(day) === dayStr)
    return d ? d.format('YYYY-MM-DD') : null
  }

  function onDropProduct(e, dayStr) {
    e.preventDefault()
    if (dragKind.current !== 'product') return
    const p    = dragPayload.current
    const ngay = dayStr || selectedDay
    setAssigns(prev => [...prev, {
      id:            uidRef.current++,
      wsId:          p.id,
      ten:           p.tenTrinh || p.maBravo || p.maSp || '(Chưa có tên)',
      maSp:          p.maSp      || '',
      maBravo:       p.maBravo   || '',
      maDonHang:     p.maDonHang || '',
      soLo:          p.soLo      || '',
      coLo:          p.coLo      || null,
      salg:          null,
      salgSessionId: null,
      toNhom:        p.toNhom    || '',
      congDoan:      p.congDoan  || '',
      isUrgent:      isUrgent(p),
      ngay,
      ngayFull:      getFullDate(ngay),
      caShifts:      { 'Ca 1': { mas: [], sessionIds: {} } },
      note:          '',
    }])
  }

  async function onDropPerson(e, assignId, caKey) {
    e.preventDefault()
    if (dragKind.current === 'person') {
      const emp    = dragPayload.current
      const assign = assigns.find(a => a.id === assignId)
      if (!assign) return
      const existingMas = assign.caShifts?.[caKey]?.mas || []
      if (existingMas.includes(emp.maNhanVien)) return

      // Optimistic UI
      setAssigns(prev => prev.map(a =>
        a.id === assignId
          ? { ...a, caShifts: { ...a.caShifts, [caKey]: { mas: [...(a.caShifts?.[caKey]?.mas || []), emp.maNhanVien], sessionIds: { ...(a.caShifts?.[caKey]?.sessionIds || {}) } } } }
          : a
      ))

      if (!assign.wsId || !assign.ngayFull) return
      const caSession = CA_TO_SESSION[caKey] || caKey

      try {
        const { data } = await api.post('/work-schedule-session', {
          workScheduleId: assign.wsId,
          ngay:           assign.ngayFull,
          maNhanVien:     emp.maNhanVien,
          nguoiThucHien:  emp.hoVaTen || emp.maNhanVien,
          nhomThucHien:   emp.toNhom  || assign.toNhom || null,
          caSanXuat:      caSession,
          loaiSession:    'KH_TO',
        })
        setAssigns(prev => prev.map(a =>
          a.id === assignId
            ? { ...a, caShifts: { ...a.caShifts, [caKey]: { mas: [...(a.caShifts?.[caKey]?.mas || [])], sessionIds: { ...(a.caShifts?.[caKey]?.sessionIds || {}), [emp.maNhanVien]: { id: data.id, locked: false } } } } }
            : a
        ))
      } catch (err) {
        if (err.response?.status === 409) {
          try {
            const { data: existingSessions } = await api.get('/work-schedule-session', { params: { scheduleId: assign.wsId } })
            const found = Array.isArray(existingSessions)
              ? existingSessions.find(s => s.maNhanVien === emp.maNhanVien && s.ngay === assign.ngayFull)
              : null
            if (found?.id) {
              setAssigns(prev => prev.map(a =>
                a.id === assignId
                  ? { ...a, caShifts: { ...a.caShifts, [caKey]: { mas: [...(a.caShifts?.[caKey]?.mas || [])], sessionIds: { ...(a.caShifts?.[caKey]?.sessionIds || {}), [emp.maNhanVien]: { id: found.id, locked: found.sanLuong != null && String(found.sanLuong).trim() !== '' } } } } }
                  : a
              ))
            }
          } catch { /* giữ trong UI */ }
        } else {
          // Rollback
          setAssigns(prev => prev.map(a =>
            a.id === assignId
              ? { ...a, caShifts: { ...a.caShifts, [caKey]: { ...(a.caShifts?.[caKey] || {}), mas: (a.caShifts?.[caKey]?.mas || []).filter(m => m !== emp.maNhanVien) } } }
              : a
          ))
          message.error('Không thể thêm người — thử lại')
        }
      }
    } else if (dragKind.current === 'personMove') {
      const { ma, fromAssignId, fromCaKey } = dragPayload.current
      if (fromAssignId === assignId && fromCaKey === caKey) return
      setAssigns(prev => prev.map(a => {
        if (a.id === fromAssignId) {
          return { ...a, caShifts: { ...a.caShifts, [fromCaKey]: { ...(a.caShifts?.[fromCaKey] || {}), mas: (a.caShifts?.[fromCaKey]?.mas || []).filter(m => m !== ma) } } }
        }
        if (a.id === assignId) {
          const existingMas = a.caShifts?.[caKey]?.mas || []
          if (existingMas.includes(ma)) return a
          return { ...a, caShifts: { ...a.caShifts, [caKey]: { ...(a.caShifts?.[caKey] || { mas: [], sessionIds: {} }), mas: [...existingMas, ma] } } }
        }
        return a
      }))
    }
  }

  async function removePerson(assignId, ma, caKey) {
    const assign     = assigns.find(a => a.id === assignId)
    let sessionInfo  = assign?.caShifts?.[caKey]?.sessionIds?.[ma]
    const caSession  = CA_TO_SESSION[caKey] || caKey

    if (!sessionInfo?.id && assign?.wsId && assign?.ngayFull) {
      try {
        const { data: sessions } = await api.get('/work-schedule-session', {
          params: { scheduleId: assign.wsId, loaiSession: 'KH_TO' }
        })
        const found = (Array.isArray(sessions) ? sessions : []).find(s =>
          s.maNhanVien === ma && s.ngay === assign.ngayFull &&
          (!caSession || s.caSanXuat === caSession)
        )
        if (found?.id) sessionInfo = { id: found.id, locked: found.sanLuong != null }
      } catch {}
    }

    if (!sessionInfo?.id && assign?.ngayFull) {
      try {
        const { data: empSessions } = await api.get('/work-schedule-session/by-employee', {
          params: { maNhanVien: ma }
        })
        const found = (Array.isArray(empSessions) ? empSessions : []).find(s =>
          s.loaiSession === 'KH_TO' && s.ngay === assign.ngayFull &&
          (!caSession || s.caSanXuat === caSession) &&
          (!assign.maSp || !s.maSp || s.maSp === assign.maSp)
        )
        if (found?.id) sessionInfo = { id: found.id, locked: found.sanLuong != null }
      } catch {}
    }

    if (!sessionInfo?.id) {
      setAssigns(prev => prev.map(a =>
        a.id === assignId
          ? { ...a, caShifts: { ...a.caShifts, [caKey]: { ...(a.caShifts?.[caKey] || {}), mas: (a.caShifts?.[caKey]?.mas || []).filter(m => m !== ma) } } }
          : a
      ))
      return
    }

    try {
      await api.delete(`/work-schedule-session/${sessionInfo.id}`)
      setAssigns(prev => prev.map(a => {
        if (a.id !== assignId) return a
        const newSessionIds = { ...(a.caShifts?.[caKey]?.sessionIds || {}) }
        delete newSessionIds[ma]
        return {
          ...a,
          caShifts: {
            ...a.caShifts,
            [caKey]: {
              ...(a.caShifts?.[caKey] || {}),
              mas: (a.caShifts?.[caKey]?.mas || []).filter(m => m !== ma),
              sessionIds: newSessionIds,
            },
          },
        }
      }))
    } catch (err) {
      const status = err?.response?.status
      const msg    = err?.response?.data?.message || err?.response?.data || ''
      message.error(`Xóa thất bại (${status || '?'}): ${msg || 'Thử lại'}`)
    }
  }

  async function removeAssign(assignId) {
    const assign = assigns.find(a => a.id === assignId)
    if (!assign) return

    const sessionIdsToDelete = Object.values(assign.caShifts || {}).flatMap(shiftData =>
      Object.values(shiftData.sessionIds || {}).filter(s => s?.id).map(s => s.id)
    )

    try {
      if (sessionIdsToDelete.length > 0) {
        await Promise.all(sessionIdsToDelete.map(id => api.delete(`/work-schedule-session/${id}`)))
      }
      setAssigns(prev => prev.filter(a => a.id !== assignId))
    } catch (err) {
      const status = err?.response?.status
      const msg    = err?.response?.data?.message || err?.response?.data || ''
      message.error(`Xóa card thất bại (${status || '?'}): ${msg || 'Thử lại'}`)
    }
  }

  function updateAssign(assignId, key, val) {
    setAssigns(prev => prev.map(a => a.id === assignId ? { ...a, [key]: val } : a))
  }

  function addShift(assignId, caKey) {
    setAssigns(prev => prev.map(a =>
      a.id === assignId
        ? { ...a, caShifts: { ...a.caShifts, [caKey]: { mas: [], sessionIds: {} } } }
        : a
    ))
  }

  function removeShift(assignId, caKey) {
    setAssigns(prev => prev.map(a => {
      if (a.id !== assignId) return a
      const { [caKey]: _removed, ...rest } = a.caShifts || {}
      return { ...a, caShifts: rest }
    }))
  }

  async function syncNoteToSessions(assignId, note) {
    const assign = assigns.find(a => a.id === assignId)
    if (!assign?.wsId) return
    const allSessionIds = Object.values(assign.caShifts || {}).flatMap(shiftData =>
      Object.values(shiftData.sessionIds || {}).filter(s => s?.id).map(s => s.id)
    )
    if (!allSessionIds.length) return
    try {
      await Promise.all(allSessionIds.map(id =>
        api.patch(`/work-schedule-session/${id}/ghi-chu`, { ghiChu: note || '' })
      ))
    } catch {}
  }

  function moveAssign(assignId, direction) {
    setAssigns(prev => {
      const dayStr = prev.find(a => a.id === assignId)?.ngay
      if (!dayStr) return prev
      const dayIdx     = prev.reduce((acc, a, i) => { if (a.ngay === dayStr) acc.push(i); return acc }, [])
      const posInDay   = dayIdx.findIndex(i => prev[i].id === assignId)
      if (direction === 'up'   && posInDay === 0)               return prev
      if (direction === 'down' && posInDay === dayIdx.length - 1) return prev
      const thisIdx = dayIdx[posInDay]
      const swapIdx = direction === 'up' ? dayIdx[posInDay - 1] : dayIdx[posInDay + 1]
      const next = [...prev]
      ;[next[thisIdx], next[swapIdx]] = [next[swapIdx], next[thisIdx]]
      return next
    })
  }

  function cloneAssign(assignId) {
    setAssigns(prev => {
      const idx = prev.findIndex(a => a.id === assignId)
      if (idx < 0) return prev
      const orig   = prev[idx]
      const cloned = {
        ...orig,
        id:       uidRef.current++,
        caShifts: Object.fromEntries(
          Object.entries(orig.caShifts || {}).map(([k, v]) => [k, { mas: [...v.mas], sessionIds: {} }])
        ),
      }
      const next = [...prev]
      next.splice(idx + 1, 0, cloned)
      return next
    })
  }

  function cloneDay(dayStr) {
    const dayIdx = days.findIndex(d => fmtDay(d) === dayStr)
    if (dayIdx < 0 || dayIdx >= days.length - 1) {
      message.warning('Không thể nhân bản: đã là ngày cuối tuần.')
      return
    }
    const nextDay    = fmtDay(days[dayIdx + 1])
    const dayAssigns = assigns.filter(a => a.ngay === dayStr)
    if (dayAssigns.length === 0) {
      message.info('Ngày này chưa có công việc nào để nhân bản.')
      return
    }
    const cloned = dayAssigns.map(a => ({
      ...a,
      id:       uidRef.current++,
      ngay:     nextDay,
      caShifts: Object.fromEntries(
        Object.entries(a.caShifts || {}).map(([k, v]) => [k, { mas: [...v.mas], sessionIds: {} }])
      ),
    }))
    setAssigns(prev => [...prev, ...cloned])
    message.success(`Đã nhân bản ${cloned.length} việc → ${DOW[days[dayIdx + 1].day()]} ${nextDay}`)
  }

  async function deletePlan(planId) {
    try {
      await api.delete(`/work-schedule/${planId}`)
      setPlans(prev => prev.filter(p => p.id !== planId))
      setAssignsByTo(prev => {
        const updated = {}
        Object.keys(prev).forEach(k => {
          updated[k] = (prev[k] || []).filter(a => a.wsId !== planId)
        })
        return updated
      })
      message.success('Đã xóa kế hoạch')
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || ''
      message.error(`Xóa thất bại: ${msg || 'Thử lại'}`)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '12px 20px', background: '#eef1f6', height: '100%', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', boxSizing: 'border-box' }}>

      {/* ── Hàng 1: Tab bộ phận + controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
        {visibleTabs.map(tab => {
          const isSel      = selectedTo === tab.key
          const tabAssigns = assignsByTo[tab.key] || []
          return (
            <button key={tab.key} onClick={() => setSelectedTo(tab.key)} style={{
              border: `1.5px solid ${isSel ? '#4f46e5' : '#cbd5e1'}`,
              background: isSel ? '#4f46e5' : '#fff',
              color: isSel ? '#fff' : '#475569',
              borderRadius: 9, padding: '5px 14px',
              cursor: 'pointer', fontWeight: 700, fontSize: 12.5,
              display: 'flex', alignItems: 'center', gap: 5,
              boxShadow: isSel ? '0 2px 8px #4f46e533' : 'none',
              transition: 'all 0.15s',
            }}>
              <TeamOutlined style={{ fontSize: 11 }} />
              {tab.label}
              {tabAssigns.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, background: isSel ? '#818cf8' : '#e2e8f0', color: isSel ? '#fff' : '#64748b', borderRadius: 999, padding: '1px 5px' }}>
                  {tabAssigns.length}
                </span>
              )}
            </button>
          )
        })}

        <div style={{ width: 1, height: 22, background: '#cbd5e1', flexShrink: 0 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, color: '#1e293b', flexShrink: 0 }}>
          <ProjectOutlined style={{ color: '#6366f1', fontSize: 15 }} />
          <span style={{ fontSize: 14 }}>Kế Hoạch Tổ</span>
          {selectedTo && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', background: '#eef2ff', borderRadius: 6, padding: '1px 7px' }}>
              {TO_TABS.find(t => t.key === selectedTo)?.label || selectedTo}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
          {TIME_MODES.map(m => (
            <button key={m.key} onClick={() => setTimeMode(m.key)} style={{
              border: 'none', cursor: 'pointer', padding: '4px 9px',
              fontWeight: 700, fontSize: 11,
              background: timeMode === m.key ? '#0f766e' : 'transparent',
              color: timeMode === m.key ? '#fff' : '#64748b',
            }}>{m.label}</button>
          ))}
        </div>

        {timeMode === 'week' && (
          <DatePicker picker="week" value={weekStart}
            onChange={v => v && setWeekStart(v.startOf('isoWeek'))}
            size="small" format="[Tuần] WW · YYYY" allowClear={false} style={{ width: 130, flexShrink: 0 }} />
        )}
        {timeMode === 'month' && (
          <DatePicker picker="month" value={monthStart}
            onChange={v => v && setMonthStart(v.startOf('month'))}
            size="small" format="MM/YYYY" allowClear={false} style={{ width: 85, flexShrink: 0 }} />
        )}

        <Button size="small" icon={<ReloadOutlined />} onClick={fetchAll} loading={loading} style={{ flexShrink: 0 }}>
          Tải lại
        </Button>

        {conflictCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 7, padding: '3px 9px', fontSize: 11.5, fontWeight: 600 }}>
            <WarningOutlined /> {conflictCount} xung đột
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          {['viec', 'nguoi'].map(v => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              border: 'none', cursor: 'pointer', padding: '5px 12px',
              fontWeight: 600, fontSize: 12,
              background: viewMode === v ? '#4f46e5' : '#fff',
              color: viewMode === v ? '#fff' : '#64748b',
            }}>
              {v === 'viec' ? 'Theo việc' : 'Theo người'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Unified panel ── */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

          {/* ── ① Kế hoạch tổng (header strip) ── */}
          <div style={{ flexShrink: 0, borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setP1Open(v => { const next = !v; sessionStorage.setItem(SS_P1_OPEN, next); return next })}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', flex: 1 }}>
                ① Kế hoạch tổng — kéo sản phẩm
                {selectedTo && <span style={{ fontWeight: 600, color: '#0f766e', marginLeft: 6, textTransform: 'none', fontSize: 10.5 }}>({filteredPlans.length})</span>}
              </span>
              <div style={{ display: 'flex', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}
                onClick={e => e.stopPropagation()}>
                {PLAN_SOURCES.map(s => (
                  <button key={s.key} onClick={() => setPlanSource(s.key)} style={{
                    border: 'none', cursor: 'pointer', padding: '3px 8px',
                    fontSize: 10.5, fontWeight: 700,
                    background: planSource === s.key ? '#4f46e5' : 'transparent',
                    color: planSource === s.key ? '#fff' : '#64748b',
                  }}>{s.label}</button>
                ))}
              </div>
              <Input.Search
                value={searchProduct}
                onChange={e => { e.stopPropagation(); setSearchProduct(e.target.value) }}
                onClick={e => e.stopPropagation()}
                placeholder="Tìm SP..."
                allowClear size="small"
                style={{ width: 160, flexShrink: 0 }}
              />
              <span style={{ color: '#94a3b8', fontSize: 13, flexShrink: 0 }}>{p1Open ? '▴' : '▾'}</span>
            </div>
            {p1Open && (
              <div style={{ overflowX: 'auto', padding: '0 12px 8px', display: 'flex', gap: 7 }}>
                {loading ? (
                  <div style={{ padding: '8px 0' }}><Spin size="small" /></div>
                ) : !selectedTo ? (
                  <div style={{ color: '#94a3b8', fontSize: 12, padding: '4px 0' }}>— Chọn tổ để xem kế hoạch —</div>
                ) : filteredPlans.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: 12, padding: '4px 0', whiteSpace: 'nowrap' }}>Không có dữ liệu.</div>
                ) : filteredPlans.map(p => {
                  const pDay   = p.ngayThucHien ? dayjs(p.ngayThucHien) : null
                  const urgent = isUrgent(p)
                  const ctxItems = {
                    items: [{
                      key: 'delete', danger: true,
                      label: (
                        <Popconfirm
                          title={`Xóa kế hoạch "${p.tenTrinh || p.maSp || p.id}"?`}
                          okText="Xóa" cancelText="Huỷ"
                          okButtonProps={{ danger: true, size: 'small' }}
                          onConfirm={() => deletePlan(p.id)}
                        >
                          <span onClick={e => e.stopPropagation()}>🗑 Xóa kế hoạch này</span>
                        </Popconfirm>
                      ),
                    }],
                  }
                  return (
                    <Dropdown key={p.id} menu={ctxItems} trigger={['contextMenu']}>
                      <div draggable onDragStart={e => onDragStartProduct(e, p)}
                        style={{ border: `1px solid ${urgent ? '#fca5a5' : '#d1fae5'}`, background: urgent ? '#fff5f5' : '#ecfdf5', borderRadius: 8, padding: '6px 9px', cursor: 'grab', flexShrink: 0, width: 195 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: urgent ? '#b91c1c' : '#065f46', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.tenTrinh || p.maBravo || p.maSp || '(Chưa có tên)'}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', marginTop: 2, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                          {p.maSp && <span>{p.maSp}</span>}
                          {p.soLo && <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 3, padding: '0 4px' }}>Lô {p.soLo}</span>}
                          {pDay && <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 3, padding: '0 4px' }}>{DOW[pDay.day()]} {fmtDay(pDay)}</span>}
                          {urgent && <span style={{ color: '#dc2626', fontWeight: 800 }}>⚠ Gấp</span>}
                        </div>
                      </div>
                    </Dropdown>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── ② Nhân viên trong tổ (header strip) ── */}
          <div style={{ flexShrink: 0, borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setP2Open(v => { const next = !v; sessionStorage.setItem(SS_P2_OPEN, next); return next })}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', flex: 1 }}>
                ② Nhân viên trong tổ — kéo người
                {empTo && <span style={{ fontWeight: 600, color: '#0f766e', marginLeft: 6, textTransform: 'none', fontSize: 10.5 }}>({displayEmps.length} người)</span>}
              </span>
              {/* Tổ tabs inline */}
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {visibleTabs.map(tab => {
                  const isSel = empTo === tab.key
                  return (
                    <button key={tab.key} onClick={() => setEmpTo(tab.key)} style={{
                      border: `1.5px solid ${isSel ? '#0f766e' : '#e2e8f0'}`,
                      background: isSel ? '#0f766e' : '#f8fafc',
                      color: isSel ? '#fff' : '#64748b',
                      borderRadius: 999, padding: '2px 8px', cursor: 'pointer', fontWeight: 700, fontSize: 10.5,
                    }}>{tab.label}</button>
                  )
                })}
              </div>
              <span style={{ color: '#94a3b8', fontSize: 13, flexShrink: 0 }}>{p2Open ? '▴' : '▾'}</span>
            </div>
            {p2Open && (
              <div style={{ overflowX: 'auto', padding: '0 12px 8px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {!empTo ? (
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>— Chọn tổ để xem nhân viên —</div>
                ) : displayEmps.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>Không có nhân viên trong tổ {TO_TABS.find(t => t.key === empTo)?.label || empTo}.</div>
                ) : displayEmps.map(emp => {
                  const isTN = (emp.viTri || '').toLowerCase().includes('tổ trưởng') || (emp.viTri || '').toUpperCase() === 'TN'
                  return (
                    <div key={emp.maNhanVien} draggable onDragStart={e => onDragStartPerson(e, emp)} title={`${emp.maNhanVien} · ${emp.toNhom || ''}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, border: `1px solid ${isTN ? '#fde68a' : '#e2e8f0'}`, background: isTN ? '#fffbeb' : '#f8fafc', borderRadius: 999, padding: '4px 10px 4px 4px', fontSize: 12, fontWeight: 600, cursor: 'grab', userSelect: 'none', flexShrink: 0 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: isTN ? '#fde68a' : '#c7d2fe', color: isTN ? '#92400e' : '#4338ca', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {initials(emp.hoVaTen)}
                      </span>
                      {emp.hoVaTen}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {viewMode === 'viec' ? (
            <>
              {/* Nav + search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px 5px', flexShrink: 0 }}>
                <Button size="small" icon={<LeftOutlined />}
                  onClick={() => { setShowAllDays(false); setWeekStart(weekStart.subtract(1, 'month').startOf('month').startOf('isoWeek')) }}
                  style={{ flexShrink: 0 }} />
                <DatePicker picker="month" value={weekStart}
                  onChange={v => v && (setShowAllDays(false), setWeekStart(v.startOf('month').startOf('isoWeek')))}
                  size="small" format="MM/YYYY" allowClear={false} style={{ width: 84, flexShrink: 0 }} />
                <Button size="small" icon={<RightOutlined />}
                  onClick={() => { setShowAllDays(false); setWeekStart(weekStart.add(1, 'month').startOf('month').startOf('isoWeek')) }}
                  style={{ flexShrink: 0 }} />
                <div style={{ width: 1, height: 16, background: '#e2e8f0', flexShrink: 0 }} />
                <Button size="small" icon={<LeftOutlined />} onClick={() => { setShowAllDays(false); setWeekStart(weekStart.subtract(1, 'week').startOf('isoWeek')) }} style={{ flexShrink: 0 }} />
                <DatePicker picker="week" value={weekStart}
                  onChange={v => v && (setShowAllDays(false), setWeekStart(v.startOf('isoWeek')))}
                  size="small" format={v => `T${v.isoWeek()} · ${v.format('MM/YY')}`} allowClear={false} style={{ width: 105, flexShrink: 0 }} />
                <Button size="small" icon={<RightOutlined />} onClick={() => { setShowAllDays(false); setWeekStart(weekStart.add(1, 'week').startOf('isoWeek')) }} style={{ flexShrink: 0 }} />
                {!showAllDays && !weekStart.isSame(dayjs().startOf('isoWeek'), 'day') && (
                  <Button size="small" onClick={() => setWeekStart(dayjs().startOf('isoWeek'))} style={{ flexShrink: 0, fontSize: 10, padding: '0 6px' }}>Nay</Button>
                )}
                <div style={{ width: 1, height: 16, background: '#e2e8f0', flexShrink: 0 }} />
                <Button size="small" type={showAllDays ? 'primary' : 'default'}
                  onClick={() => setShowAllDays(v => !v)}
                  style={{ flexShrink: 0, fontSize: 11, padding: '0 8px' }}>Tất cả</Button>
                <Input size="small" placeholder="Tìm SP, mã, số lô..."
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  allowClear value={detailSearch}
                  onChange={e => setDetailSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 0 }} />
              </div>

              {/* Horizontal table */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', margin: '0 10px 10px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: '#334155', borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0', minWidth: 200, whiteSpace: 'nowrap' }}>Sản phẩm</th>
                      <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, color: '#334155', borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0', width: 88, whiteSpace: 'nowrap' }}>Công đoạn</th>
                      <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: '#334155', borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>Người thực hiện</th>
                      <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, color: '#334155', borderBottom: '2px solid #e2e8f0', width: 112, whiteSpace: 'nowrap' }}>Tình trạng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const renderDays = showAllDays
                        ? [...new Set(assigns.map(a => a.ngayFull).filter(Boolean))].sort((a, b) => b.localeCompare(a)).map(s => dayjs(s))
                        : [...days].reverse()
                      const q = detailSearch.toLowerCase()
                      return renderDays.map(d => {
                        const dayStr     = fmtDay(d)
                        const dayAssigns = assigns.filter(a => a.ngay === dayStr && (
                          !q ||
                          (a.ten || '').toLowerCase().includes(q) ||
                          (a.maSp || '').toLowerCase().includes(q) ||
                          (a.soLo || '').toLowerCase().includes(q) ||
                          (a.maDonHang || '').toLowerCase().includes(q)
                        ))
                        const isSel       = dayStr === selectedDay
                        const isEditing   = editingDays.has(dayStr)
                        const hasSaveable = dayAssigns.some(a => a.wsId && a.ngayFull)
                        const ni = days.findIndex(d2 => fmtDay(d2) === dayStr)
                        const nd = ni >= 0 && ni < days.length - 1 ? days[ni + 1] : null
                        const enterEdit   = () => setEditingDays(prev => new Set([...prev, dayStr]))
                        const exitEdit    = () => setEditingDays(prev => { const n = new Set(prev); n.delete(dayStr); return n })
                        const colSpan     = isEditing ? 5 : 4
                        return (
                          <React.Fragment key={dayStr}>
                            {/* Day group header */}
                            <tr>
                              <td colSpan={colSpan} style={{ padding: '6px 12px', background: isSel ? '#eef2ff' : '#f8fafc', fontWeight: 800, fontSize: 12, color: isSel ? '#4338ca' : '#475569', borderTop: '2px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span>{DOW[d.day()]} · {dayStr}</span>
                                  {isSel && <span style={{ fontSize: 10, background: '#eef2ff', color: '#4338ca', borderRadius: 999, padding: '1px 8px', fontWeight: 800 }}>Đang xếp</span>}
                                  {dayAssigns.length > 0 && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{dayAssigns.length} việc</span>}
                                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    {isEditing ? (
                                      <>
                                        {hasSaveable && (
                                          <Button size="small" type="primary" icon={<SaveOutlined />}
                                            loading={savingDay === dayStr}
                                            onClick={async () => { await handleSaveDay(dayStr); exitEdit() }}
                                            style={{ background: '#16a34a', borderColor: '#16a34a', fontSize: 11, height: 24 }}>
                                            Lưu
                                          </Button>
                                        )}
                                        <Button size="small" onClick={exitEdit} style={{ fontSize: 11, height: 24 }}>Huỷ</Button>
                                        <Tooltip title={nd ? `Sao chép sang ${DOW[nd.day()]} ${fmtDay(nd)}` : 'Đã là ngày cuối tuần'}>
                                          <button onClick={() => cloneDay(dayStr)} disabled={!nd}
                                            style={{ border: '1px solid #e2e8f0', background: nd ? '#f8fafc' : '#f1f5f9', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: nd ? '#64748b' : '#cbd5e1', cursor: nd ? 'pointer' : 'default' }}>
                                            ⧉ Nhân bản
                                          </button>
                                        </Tooltip>
                                      </>
                                    ) : (
                                      <Button size="small" onClick={enterEdit} style={{ fontSize: 11, height: 24 }}>✏ Cập nhật</Button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {/* Assign rows */}
                            {dayAssigns.map((a, idx) => (
                              <AssignRow key={a.id} a={a} employees={employees} dup={dup}
                                onDragOver={onDragOver} onDropPerson={onDropPerson}
                                onRemovePerson={removePerson} onUpdate={updateAssign} onRemove={removeAssign}
                                isFirst={idx === 0} isLast={idx === dayAssigns.length - 1}
                                onMoveUp={() => moveAssign(a.id, 'up')} onMoveDown={() => moveAssign(a.id, 'down')}
                                onClone={cloneAssign} onDragStartPersonMove={onDragStartPersonMove}
                                onSyncNote={syncNoteToSessions} onAddShift={addShift} onRemoveShift={removeShift}
                                readOnly={!isEditing} />
                            ))}
                            {/* Drop zone row */}
                            {isEditing && (
                              <tr>
                                <td colSpan={5}
                                  onDragOver={onDragOver} onDrop={e => onDropProduct(e, dayStr)}
                                  onDragEnter={e => { e.preventDefault(); e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.color = '#4f46e5' }}
                                  onDragLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#94a3b8' }}
                                  style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11.5, color: '#94a3b8', border: '2px dashed #cbd5e1', transition: 'all 0.15s', cursor: 'copy' }}>
                                  + kéo sản phẩm vào ngày này
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!selectedTo ? (
                <div style={{ color: '#94a3b8', fontSize: 12, padding: 12 }}>Chọn tổ ở thanh trên.</div>
              ) : displayEmps.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 12, padding: 12 }}>Không có nhân viên trong tổ {selectedTo}.</div>
              ) : displayEmps.map(emp => {
                const empAssigns = assigns.filter(a =>
                  Object.values(a.caShifts || {}).some(shift => (shift.mas || []).includes(emp.maNhanVien))
                )
                const isTN = (emp.viTri || '').toLowerCase().includes('tổ trưởng') || (emp.viTri || '').toUpperCase() === 'TN'
                return (
                  <div key={emp.maNhanVien} style={{ border: '1px solid #e2e8f0', borderRadius: 11, padding: '11px 13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, marginBottom: 7 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: isTN ? '#fde68a' : '#c7d2fe', color: isTN ? '#92400e' : '#4338ca', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {initials(emp.hoVaTen)}
                      </span>
                      <span style={{ color: '#475569', fontSize: 12 }}>{emp.maNhanVien}</span>
                      <span>{emp.hoVaTen}</span>
                      {isTN && <span style={{ fontSize: 10, fontWeight: 700, background: '#fde68a', color: '#92400e', borderRadius: 4, padding: '1px 6px' }}>Tổ trưởng</span>}
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#64748b', background: '#f1f5f9', borderRadius: 999, padding: '2px 9px' }}>{empAssigns.length} việc</span>
                    </div>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 0, margin: 0 }}>
                      {empAssigns.length === 0 ? (
                        <li style={{ color: '#94a3b8', fontSize: 12 }}>Chưa được xếp việc nào</li>
                      ) : empAssigns.map(a => {
                        const empShifts = Object.entries(a.caShifts || {})
                          .filter(([, shift]) => (shift.mas || []).includes(emp.maNhanVien))
                          .map(([caKey]) => caKey)
                        const isConflict = empShifts.some(caKey => dup.has(`${emp.maNhanVien}|${a.ngay}|${caKey}`))
                        return (
                          <li key={a.id} style={{ fontSize: 12.5, color: '#334155', display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, borderRadius: 5, padding: '2px 7px', background: '#f1f5f9', color: '#334155' }}>
                              {a.ngay}
                            </span>
                            {empShifts.map(caKey => {
                              const cs = CA_STYLE[caKey] || CA_STYLE['Ca 1']
                              return (
                                <span key={caKey} style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: '2px 7px', background: cs.bg, color: cs.text }}>
                                  {caKey}
                                </span>
                              )
                            })}
                            {a.ten}
                            {a.note && <span style={{ color: '#94a3b8', fontSize: 11.5 }}>· {a.note}</span>}
                            {isConflict && <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 11 }}>⚠ trùng</span>}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
