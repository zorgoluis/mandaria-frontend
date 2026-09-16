import { api } from '../services/api'
import type { User } from '../types/api'
export const users = {
  list: (signal?: AbortSignal) =>
    api<User[]>('/users', 'GET', undefined, signal),
}
