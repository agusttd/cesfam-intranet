"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function FuncionarioDashboard() {
  const router = useRouter()

  useEffect(() => {
    const rol = localStorage.getItem("rol")
    if (rol !== "FUNCIONARIO") {
      router.push("/login")
    }
  }, [router])

  return <h1>Panel de Funcionarios (Ver Comunicados y Documentos)</h1>
}
