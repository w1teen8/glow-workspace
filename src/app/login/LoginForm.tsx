"use client";

import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: form.get("login"), password: form.get("password") }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не получилось войти");
    } catch {
      setError("Нет соединения с сервером");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Glow Workspace</h1>
      <input className="field" name="login" placeholder="Логин" autoComplete="username" required autoFocus />
      <input
        className="field"
        name="password"
        type="password"
        placeholder="Пароль"
        autoComplete="current-password"
        required
      />
      <button className="button" disabled={busy}>
        {busy ? "Входим…" : "Войти"}
      </button>
      <p className="error" role="alert">
        {error}
      </p>
    </form>
  );
}
