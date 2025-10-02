"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  const router = useRouter()

  useEffect(() => {
    const rol = localStorage.getItem("rol")
    if (rol !== "ADMIN" && rol !== "SUBDIRECCION") {
      router.push("/login")
    }
  }, [router])

  return <h1>Panel Administrativo (Subida de Documentos y Comunicados)</h1>
}
