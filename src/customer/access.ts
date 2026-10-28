export interface AccessChallenge {
  token: string
  purpose: string
}
export function consumeAccessFragment(): AccessChallenge {
  const p = new URLSearchParams(window.location.hash.slice(1))
  const result = {
    token: p.get('token') ?? '',
    purpose: p.get('purpose') ?? '',
  }
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  )
  return result
}
