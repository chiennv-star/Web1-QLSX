import { useEffect } from 'react'

const REFRESH_MS = 2_000   // 2 giây

/**
 * Phát sự kiện 'app:silent-refresh' mỗi REFRESH_MS ms.
 * Các trang lắng nghe sự kiện này và tự làm mới dữ liệu mà không reload trang.
 */
export function useAutoReload() {
  useEffect(() => {
    const interval = setInterval(() => {
      window.dispatchEvent(new CustomEvent('app:silent-refresh'))
    }, REFRESH_MS)
    return () => clearInterval(interval)
  }, [])
}
