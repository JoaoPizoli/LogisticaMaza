import { apiPost } from "../api"

export function loginApi(
  email: string,
  senha: string,
): Promise<{ access_token: string }> {
  return apiPost("/auth/login", { email, senha })
}

export function logoutApi(): Promise<void> {
  return apiPost("/auth/logout")
}
