"use client";

import { useState } from "react";

export default function LoginPage() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, password }),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("rol", data.rol);

      // Redirigir según rol
      if (data.rol === "ADMIN" || data.rol === "SUBDIRECCION") {
        window.location.href = "/dashboard/admin";
      } else {
        window.location.href = "/dashboard";
      }
    } else {
      alert(data.error);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <form
        onSubmit={handleLogin}
        className="bg-white text-black p-6 rounded shadow-md"
      >
        <h2 className="text-xl font-bold mb-4">Intranet CESFAM</h2>
        <input
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          className="border p-2 mb-2 w-full"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 mb-2 w-full"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 w-full rounded"
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
