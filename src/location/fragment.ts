let initialToken = ''
/** Called in main before importing the application or any optional third-party component. */
export function captureTrackingFragment() {
  if (window.location.pathname !== '/track') return
  const token =
    new URLSearchParams(window.location.hash.slice(1)).get('t') ?? ''
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  )
  initialToken = /^[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/.test(token)
    ? token
    : ''
}
export function takeTrackingToken() {
  const token = initialToken
  initialToken = ''
  return token
}
