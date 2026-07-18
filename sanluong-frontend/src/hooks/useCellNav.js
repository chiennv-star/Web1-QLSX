import { useState, useCallback, useRef } from 'react'

// Điều hướng ô bảng bằng phím mũi tên (kiểu Excel) — dùng chung cho các bảng Ant Design Table.
// Click 1 lần = chọn ô (di chuyển được bằng mũi tên). Enter hoặc click đúp = kích hoạt onEdit(row, col).
export default function useCellNav({ rowCount, colCount, onEdit }) {
  const [selected, setSelected] = useState(null) // { row, col }
  const wrapRef = useRef(null)

  const select = useCallback((row, col) => {
    setSelected({ row, col })
    wrapRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback((e) => {
    // Đang gõ trong input/select/textarea (ô đang sửa) → không chặn phím mũi tên của nó
    const tag = e.target?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return
    if (!selected) return
    const { row, col } = selected
    if (e.key === 'ArrowDown')       { e.preventDefault(); setSelected({ row: Math.min(row + 1, rowCount - 1), col }) }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); setSelected({ row: Math.max(row - 1, 0), col }) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setSelected({ row, col: Math.min(col + 1, colCount - 1) }) }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); setSelected({ row, col: Math.max(col - 1, 0) }) }
    else if (e.key === 'Enter')      { e.preventDefault(); onEdit && onEdit(row, col) }
    else if (e.key === 'Escape')     { setSelected(null) }
  }, [selected, rowCount, colCount, onEdit])

  const cellProps = useCallback((row, col) => ({
    onClick: () => select(row, col),
    onDoubleClick: () => onEdit && onEdit(row, col),
    className: selected && selected.row === row && selected.col === col ? 'cellnav-selected' : '',
  }), [selected, select, onEdit])

  const wrapProps = {
    ref: wrapRef,
    tabIndex: 0,
    onKeyDown: handleKeyDown,
    style: { outline: 'none' },
  }

  // Bọc nguyên mảng columns của Ant Design Table — gắn onCell điều hướng theo đúng thứ tự cột,
  // giữ nguyên onCell sẵn có của từng cột (nếu có) bằng cách merge.
  const withNav = useCallback((columns) => columns.map((col, idx) => ({
    ...col,
    onCell: (record, rowIndex) => ({
      ...(col.onCell ? col.onCell(record, rowIndex) : null),
      ...cellProps(rowIndex, idx),
    }),
  })), [cellProps])

  return { selected, setSelected, select, cellProps, wrapProps, withNav }
}
