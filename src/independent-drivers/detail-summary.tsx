import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '../components/ui'
import { categoryBlock, validCategory } from '../driver-category/contract'
import { creditKeys } from '../credits/queries'
import { independentCreditsAdmin } from '../credits/service'
import { formatCredits } from '../credits/format'
import { date, labels } from '../utils/format'
import { independentStatusLabels } from './format'
import type { IndependentDriverProfile } from './types'

export function CopyIdentifier({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  const [result, setResult] = useState('')
  return value ? (
    <div className="independent-identifier">
      <code title={value}>{value}</code>
      <button
        type="button"
        aria-label={`Copiar ID de ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setResult('Copiado')
          } catch {
            setResult('No se pudo copiar. Selecciona el identificador.')
          }
        }}
      >
        Copiar
      </button>
      {result && <small role="status">{result}</small>}
    </div>
  ) : (
    <>No disponible</>
  )
}

export function DetailHeader({
  profile,
}: {
  profile: IndependentDriverProfile
}) {
  const account = useQuery({
    queryKey: creditKeys.account('independent', profile.driverId),
    queryFn: ({ signal }) =>
      independentCreditsAdmin.account(profile.driverId, signal),
  })
  const category = validCategory(profile.driverCategory)
    ? profile.driverCategory
    : undefined
  const membership = category?.independentMembershipState
  const approval = category?.independentApprovalStatus
  return (
    <>
      <header className="independent-detail-header">
        <Link to="/independent-drivers">
          <ArrowLeft size={16} /> Independientes
        </Link>
        <div className="independent-person">
          <span className="independent-avatar" aria-hidden="true">
            {profile.driver.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((n) => n[0])
              .join('')
              .toLocaleUpperCase('es-MX')}
          </span>
          <div>
            <h1>{profile.driver.name}</h1>
            <div className="independent-badges">
              <Badge
                value={profile.status}
                label={independentStatusLabels[profile.status]}
              />
              <span>
                {category
                  ? `${category.category === 'INDEPENDENT' ? 'Independiente' : category.category} · Revisión ${category.categoryRevision}`
                  : 'Categoría sin confirmar'}
              </span>
              <span>
                {profile.driver.user
                  ? profile.driver.user.active
                    ? 'Cuenta activa'
                    : 'Cuenta inactiva'
                  : 'Acceso sin confirmar'}
              </span>
              <span>
                Disponibilidad:{' '}
                {labels[profile.driver.availability] ??
                  profile.driver.availability}
              </span>
            </div>
          </div>
        </div>
      </header>
      <div className="independent-metrics">
        <Metric
          label="Pertenencia"
          value={
            membership === 'CURRENT'
              ? 'Vigente'
              : membership === 'HISTORICAL'
                ? 'Histórica'
                : 'Sin confirmar'
          }
          detail={membership ?? '—'}
          positive={membership === 'CURRENT'}
        />
        <Metric
          label="Aprobación"
          value={
            approval === 'APPROVED'
              ? 'Aprobada'
              : approval
                ? independentStatusLabels[approval]
                : 'Sin confirmar'
          }
          detail={approval ?? '—'}
          positive={approval === 'APPROVED'}
          danger={approval === 'SUSPENDED' || approval === 'REJECTED'}
        />
        <Metric
          label="Habilitación"
          value={independentStatusLabels[profile.status]}
          detail={
            profile.approvedAt
              ? date(profile.approvedAt)
              : 'Sin fecha de habilitación'
          }
          positive={profile.status === 'APPROVED'}
          danger={
            profile.status === 'SUSPENDED' || profile.status === 'REJECTED'
          }
        />
        <Metric
          label="Saldo de créditos"
          value={
            account.isPending
              ? 'Consultando…'
              : account.isError
                ? 'No disponible'
                : formatCredits(account.data.balance)
          }
          detail={
            account.isSuccess
              ? `Actualizado ${date(account.data.updatedAt)}`
              : 'Consulta el detalle de créditos'
          }
          positive={account.isSuccess}
        />
      </div>
      <div className="independent-category">
        <section className="panel" aria-label="Categoría vigente">
          <p>
            {categoryBlock(category) ??
              'Independiente vigente. Zonas, requisitos y recepción se verifican por separado.'}
          </p>
          {category?.category === 'INDEPENDENT' && (
            <p>
              La transición de independiente a flotilla está bloqueada por
              decisión de negocio; suspender o rechazar no habilita esa
              transición.
            </p>
          )}
        </section>
      </div>
    </>
  )
}
function Metric({
  label,
  value,
  detail,
  positive,
  danger = false,
}: {
  label: string
  value: string
  detail: string
  positive: boolean
  danger?: boolean
}) {
  return (
    <div className="independent-metric">
      <span>{label}</span>
      <strong
        className={danger ? 'negative' : positive ? 'positive' : 'pending'}
      >
        {value}
      </strong>
      <small>{detail}</small>
    </div>
  )
}
