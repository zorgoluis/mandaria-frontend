import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Field } from '../components/ui'
import { useAuth } from '../auth/context'
import { customer } from './service'

export function OriginContact({
  onNameChange,
  onPhoneChange,
  nameError,
  phoneError,
  showRestore = false,
}: {
  onNameChange?: (name: string) => void
  onPhoneChange?: (phone: string) => void
  nameError?: string
  phoneError?: string
  showRestore?: boolean
} = {}) {
  const { user } = useAuth()
  // Undefined means untouched; an empty string is an intentional user edit.
  const [name, setName] = useState<string>()
  const profile = useQuery({
    queryKey: ['customer', user?.id, 'profile'],
    queryFn: customer.profile,
    enabled: !!user,
    retry: false,
  })
  const candidate = profile.data?.active ? profile.data.displayName.trim() : ''
  const suggestion =
    !profile.isError && candidate.length <= 100 ? candidate : ''
  useEffect(() => {
    onNameChange?.(name ?? suggestion)
  }, [name, suggestion, onNameChange])
  return (
    <>
      <div className="conversion-origin-name">
        <Field
          label="Contacto de origen"
          hint="Puedes editar el nombre si otra persona entregará el paquete."
        >
          <input
            name="name0"
            aria-invalid={!!nameError}
            required
            maxLength={100}
            value={name ?? suggestion}
            onChange={(e) => setName(e.target.value)}
          />
          {nameError && <small className="conversion-error">{nameError}</small>}
        </Field>
        {showRestore && (
          <button
            type="button"
            className="conversion-restore"
            disabled={!suggestion}
            onClick={() => setName(suggestion)}
          >
            Usar mi nombre de perfil
          </button>
        )}
      </div>
      {profile.isError && (
        <p role="status">
          No se pudo obtener tu nombre de perfil. Puedes escribir el contacto
          manualmente.
        </p>
      )}
      <Field
        label="Teléfono de origen"
        hint="Tu perfil no incluye teléfono. Escribe el número de quien entregará el paquete."
      >
        <input
          name="phone0"
          type="tel"
          inputMode="tel"
          placeholder="10 dígitos"
          required
          maxLength={30}
          aria-invalid={!!phoneError}
          onChange={(e) => onPhoneChange?.(e.target.value)}
        />
        {phoneError && <small className="conversion-error">{phoneError}</small>}
      </Field>
    </>
  )
}
