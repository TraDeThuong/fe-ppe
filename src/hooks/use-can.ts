"use client";
import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
export function useCan() {
  const user = useContext(AuthContext)?.user;
  return (permission: string) => user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" || Boolean(user?.permissions?.includes(permission));
}
