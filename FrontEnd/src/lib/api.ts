const API_URL = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_API_URL não está configurada.")
    }
    return "http://localhost:3001"
  }
  return url
})()

const REQUEST_TIMEOUT_MS = 15_000

const TOKEN_KEY = "logistica_token"

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(0, "A requisição expirou. Verifique sua conexão.")
    }
    throw new ApiError(0, "Erro de conexão. Verifique sua internet.")
  } finally {
    clearTimeout(timeoutId)
  }

  if (res.status === 401) {
    const isLoginPage =
      typeof window !== "undefined" &&
      window.location.pathname.includes("/login")

    if (!isLoginPage) {
      clearStoredToken()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
      throw new ApiError(401, "Sessão expirada. Faça login novamente.")
    }
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T
  }

  const body = await res.text()

  if (!res.ok) {
    let rawMessage = "Erro inesperado"
    try {
      const json = JSON.parse(body)
      rawMessage = json.message || json.error || rawMessage
      if (Array.isArray(rawMessage)) rawMessage = rawMessage.join(", ")
    } catch {
      rawMessage = body || rawMessage
    }
    throw new ApiError(res.status, rawMessage)
  }

  try {
    return JSON.parse(body) as T
  } catch {
    return body as unknown as T
  }
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" })
}

export function apiPost<T>(path: string, data?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  })
}

export function apiPatch<T>(path: string, data?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  })
}

export function apiDelete(path: string): Promise<void> {
  return request<void>(path, { method: "DELETE" })
}
