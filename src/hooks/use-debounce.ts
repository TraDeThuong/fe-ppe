"use client";

import { useEffect, useState } from "react";

/**
 * Hook trì hoãn cập nhật giá trị theo khoảng thời gian delay (mặc định 350ms).
 * Dùng tối ưu tìm kiếm search input, chống spam API request liên tục.
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
