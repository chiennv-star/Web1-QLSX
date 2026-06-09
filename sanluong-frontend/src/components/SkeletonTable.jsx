import { Skeleton, Table } from 'antd'

/**
 * Drop-in thay thế cho <Table>.
 * - loading=true + dataSource rỗng  → hiển thị skeleton rows (không spinner)
 * - loading=true + dataSource có data → hiển thị Table bình thường với spinner overlay
 * - loading=false                    → hiển thị Table bình thường
 */
export default function SkeletonTable({
  loading,
  dataSource,
  columns,
  rowCount = 8,
  ...rest
}) {
  const isEmpty = !dataSource || dataSource.length === 0

  if (loading && isEmpty) {
    const visibleCols = (columns || []).slice(0, 7)
    const colCount = visibleCols.length || 5

    return (
      <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
        {/* Header */}
        <div style={{
          display: 'flex', gap: 10, padding: '10px 12px',
          background: '#fafafa', borderBottom: '1px solid #f0f0f0',
        }}>
          {Array.from({ length: colCount }).map((_, i) => (
            <Skeleton.Input
              key={i} active size="small"
              style={{ flex: 1, height: 14, minWidth: 30, borderRadius: 4 }}
            />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: rowCount }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            style={{
              display: 'flex', gap: 10, padding: '11px 12px',
              borderBottom: rowIdx < rowCount - 1 ? '1px solid #f5f5f5' : 'none',
              background: '#fff',
            }}
          >
            {Array.from({ length: colCount }).map((_, colIdx) => (
              <Skeleton.Input
                key={colIdx} active size="small"
                style={{
                  flex: 1, height: 12, minWidth: 30, borderRadius: 3,
                  opacity: Math.max(0.25, 1 - rowIdx * 0.09),
                }}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <Table
      loading={loading}
      dataSource={dataSource}
      columns={columns}
      {...rest}
    />
  )
}
