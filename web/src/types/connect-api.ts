export type ConnectInitResponse = { ok: true }

export type ConnectSubmitResponse =
  | { location: string }
  | { error: 'invalid_key' | 'session_expired' | 'server_busy' }
