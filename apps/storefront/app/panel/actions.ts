"use server"

import { redirect } from "next/navigation"
import { clearAdminToken, loginAdmin, setAdminToken } from "@/lib/admin-auth"

export type LoginState = { error?: string; email?: string }

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  if (!email.trim() || !password) return { error: "Completá email y contraseña.", email }

  const { token, error } = await loginAdmin(email, password)
  if (!token) return { error, email }

  await setAdminToken(token)
  redirect("/panel")
}

export async function logoutAction() {
  await clearAdminToken()
  redirect("/panel/ingresar")
}
