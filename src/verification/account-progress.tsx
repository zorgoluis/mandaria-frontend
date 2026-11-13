import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, Clock3, FileCheck2 } from 'lucide-react'
import { useAuth } from '../auth/context'
import { verification } from './service'
import { vkey } from './format'
import { consultationError } from './availability'
import type { CaseStatus } from './types'
import './account-progress.css'

const caseText: Record<CaseStatus, string> = {
  DRAFT: 'Borrador guardado · aún no enviado',
  SUBMITTED: 'En revisión · ya enviaste este expediente',
  APPROVED: 'Aprobado',
  REJECTED: 'Requiere atención · revisa las observaciones',
  WITHDRAWN: 'Retirado · consulta cómo continuar',
}

export function AccountRegistrationProgress() {
  const { user, loading, expired } = useAuth()
  if (!user || user.role !== 'DRIVER' || !user.active || loading || expired)
    return null
  return (
    <Progress
      key={user.id}
      actor={user.id}
      emailConfirmed={!!user.emailVerifiedAt}
    />
  )
}
function Progress({
  actor,
  emailConfirmed,
}: {
  actor: string
  emailConfirmed: boolean
}) {
  const query = useQuery({
    queryKey: vkey(actor, 'onboarding'),
    queryFn: ({ signal }) => verification.onboarding(signal),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    retry: false,
  })
  const data = query.data
  if (query.isPending || query.isError || !data)
    return (
      <section className="account-registration" aria-label="Mi registro">
        <h2>Mi registro</h2>
        {query.isError ? (
          <>
            <p role="alert">{consultationError(query.error)}</p>
            <button
              className="button secondary"
              onClick={() => void query.refetch()}
            >
              Volver a consultar
            </button>
          </>
        ) : (
          <p role="status">Consultando tu avance guardado…</p>
        )}
      </section>
    )
  const profile = data.driver.independentProfile
  const fleet = !profile && !!data.driver.providerId
  const cases = (vehicleId?: string) =>
    data.subjects
      .filter((s) =>
        vehicleId
          ? s.vehicleId === vehicleId
          : s.driverId === data.driver.id && !s.vehicleId,
      )
      .flatMap((s) => s.cases)
      .find((c) => c.environment === data.environment)
  const termsDone =
    !!data.terms.requiredVersion &&
    data.terms.acceptance?.version === data.terms.requiredVersion
  const rows: { label: string; detail: string; done: boolean }[] = [
    {
      label: 'Correo electrónico',
      detail: emailConfirmed ? 'Confirmado' : 'Falta confirmar tu correo',
      done: emailConfirmed,
    },
    {
      label: 'Términos y privacidad',
      detail: termsDone
        ? 'Aceptaciones guardadas'
        : 'Falta revisar y aceptar los términos vigentes',
      done: termsDone,
    },
  ]
  const documents = [
    { label: 'Identidad', record: cases() },
    ...(profile?.vehicles.length
      ? profile.vehicles.map((v, i) => ({
          label:
            profile.vehicles.length > 1
              ? `Unidad ${i + 1} · ${v.identifier}`
              : 'Unidad',
          record: cases(v.id),
        }))
      : [{ label: 'Unidad', record: undefined }]),
  ]
  for (const { label, record } of documents)
    rows.push({
      label,
      detail: record
        ? caseText[record.status]
        : label === 'Identidad'
          ? 'Faltan tus datos y documentos de identidad'
          : 'Falta completar el vehículo y sus documentos',
      done: record?.status === 'SUBMITTED' || record?.status === 'APPROVED',
    })
  const pending =
    !emailConfirmed ||
    !termsDone ||
    documents.some(
      (d) => !d.record || !['SUBMITTED', 'APPROVED'].includes(d.record.status),
    )
  const reviewing = documents.some((d) => d.record?.status === 'SUBMITTED')
  const blocked = !!data.terms.blockingReason || !data.terms.requiredVersion
  const action =
    fleet || blocked
      ? 'Consultar mi verificación'
      : pending
        ? 'Continuar mi registro'
        : reviewing
          ? 'Ver estado de mi solicitud'
          : 'Ver mis documentos'
  return (
    <section
      className="account-registration"
      aria-labelledby="account-registration-title"
    >
      <div className="account-registration-heading">
        <span className="account-registration-icon">
          <FileCheck2 size={25} aria-hidden="true" />
        </span>
        <div>
          <p className="account-registration-eyebrow">
            MI VERIFICACIÓN DOCUMENTAL
          </p>
          <h2 id="account-registration-title">
            {fleet
              ? 'Consulta tu verificación'
              : blocked
                ? 'Consulta la disponibilidad del registro'
                : pending
                  ? 'Continúa donde te quedaste'
                  : reviewing
                    ? 'Tu solicitud está en revisión'
                    : 'Tus documentos están aprobados'}
          </h2>
        </div>
      </div>
      <p className="account-registration-description">
        {fleet
          ? 'Tu flotilla gestiona la presentación de documentos. Consulta el estado y los pasos que te corresponden.'
          : blocked
            ? 'Tu avance guardado se conserva. Consulta los requisitos vigentes antes de continuar.'
            : pending
              ? 'Conservamos lo que ya guardaste. Completa los pasos pendientes para enviar tu solicitud a revisión.'
              : reviewing
                ? 'Ya enviaste tus expedientes. Puedes consultar su estado y las observaciones disponibles.'
                : 'Consulta tus documentos y su vigencia. La aprobación documental no habilita por sí sola la operación.'}
      </p>
      {!fleet && (
        <ul
          className="account-registration-steps"
          aria-label="Tu avance guardado"
        >
          {rows.map((row) => (
            <li key={row.label} className={row.done ? 'is-done' : ''}>
              <span className="account-registration-step-icon">
                {row.done ? (
                  <Check size={17} aria-hidden="true" />
                ) : (
                  <Clock3 size={17} aria-hidden="true" />
                )}
              </span>
              <div>
                <strong>{row.label}</strong>
                <span>{row.detail}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="account-registration-footer">
        <Link className="button" to="/driver/onboarding">
          {action}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <small>
          Continúa con esta cuenta. No necesitas registrarte otra vez.
        </small>
      </div>
    </section>
  )
}
