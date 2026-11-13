import { ApiError } from '../services/errors'

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
// HTML counts UTF-16 units; allow surrogate pairs and validate code points on submit.
export const PASSWORD_INPUT_MAX_LENGTH = PASSWORD_MAX_LENGTH * 2
export const PASSWORD_HINT = `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres, sin combinación obligatoria.`
export class PasswordPolicyError extends ApiError {
  constructor() {
    super(
      400,
      `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`,
    )
  }
}
export function validateNewPassword(password: string) {
  const length = Array.from(password).length
  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH)
    throw new PasswordPolicyError()
}
