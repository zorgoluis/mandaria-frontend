export function parseEnv(values: Record<string, unknown>) {
  const raw = values.VITE_API_URL
  if (typeof raw !== 'string' || !raw.trim())
    throw new Error(
      'Configura VITE_API_URL en .env antes de iniciar Mandaria Web.',
    )
  const url = new URL(raw)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      'VITE_API_URL debe ser una URL HTTP válida sin credenciales ni parámetros.',
    )
  return { apiUrl: url.toString().replace(/\/$/, '') }
}
export const env = parseEnv(import.meta.env)
