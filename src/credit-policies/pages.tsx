import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calculator, History } from 'lucide-react'
import {
  ActionForm,
  Badge,
  Empty,
  ErrorState,
  Field,
  InfoGrid,
  Loading,
  Modal,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { ApiError } from '../services/errors'
import { formatCredits, formatDistance } from '../credits/format'
import { serviceTypes } from '../pricing/types'
import { date } from '../utils/format'
import { creditPolicies } from './service'
import { policyKeys, refreshPolicies } from './queries'
import {
  actorLabel,
  actorTypeLabels,
  calculationLabel,
  calculationTypeLabels,
  policyStatusLabels,
  policySummary,
  policyTitle,
  rangeLabel,
  serviceLabel,
} from './format'
import {
  MAX_DISTANCE_METERS,
  MAX_POLICY_CREDITS,
  MAX_POLICY_RANGES,
  POLICY_REASON_MAX,
  POLICY_REASON_MIN,
  calculationTypes,
  policyActorTypes,
  policyStatuses,
  type CalculationType,
  type CreditPolicy,
  type PolicyActorType,
  type PolicyVersionInput,
  type RangeInput,
} from './types'
import type { ServiceType } from '../pricing/types'

const PAGE_SIZE = 20

export function CreditPoliciesPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1) || 1
  const filters = {
    page,
    pageSize: PAGE_SIZE,
    serviceType: params.get('serviceType') ?? undefined,
    actorType: params.get('actorType') ?? undefined,
    status: params.get('status') ?? undefined,
  }
  const query = useQuery({
    queryKey: policyKeys.list(filters),
    queryFn: ({ signal }) => creditPolicies.list(filters, signal),
  })
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    setParams(next)
  }
  return (
    <>
      <PageTitle
        title="Políticas de créditos"
        description="Cuántos créditos cuesta adjudicarse un servicio, por tipo de servicio y actor"
        action={
          <Link className="button" to="/credit-policies/new">
            Nueva política
          </Link>
        }
      />
      <CreditCalculator />
      <section className="panel" aria-labelledby="policies-list">
        <div className="panel-toolbar">
          <div>
            <h2 id="policies-list">Versiones</h2>
            <p>
              Vigentes e históricas. Una versión nunca se edita ni se elimina
            </p>
          </div>
        </div>
        <div className="filters">
          <Field label="Tipo de servicio">
            <select
              value={params.get('serviceType') ?? ''}
              onChange={(event) => set('serviceType', event.target.value)}
            >
              <option value="">Todos</option>
              {serviceTypes.map((value) => (
                <option key={value} value={value}>
                  {serviceLabel(value)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Actor que paga">
            <select
              value={params.get('actorType') ?? ''}
              onChange={(event) => set('actorType', event.target.value)}
            >
              <option value="">Todos</option>
              {policyActorTypes.map((value) => (
                <option key={value} value={value}>
                  {actorTypeLabels[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select
              value={params.get('status') ?? ''}
              onChange={(event) => set('status', event.target.value)}
            >
              <option value="">Todos</option>
              {policyStatuses.map((value) => (
                <option key={value} value={value}>
                  {policyStatusLabels[value]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="panel-body">
          {query.isPending ? (
            <Loading />
          ) : query.isError ? (
            <ErrorState
              error={query.error}
              retry={() => {
                void query.refetch()
              }}
            />
          ) : (
            <>
              <Table
                stacked
                rows={query.data.items}
                emptyTitle="Todavía no hay políticas de créditos."
                empty="Crea la primera política para que Mandaria pueda calcular el costo de un servicio."
                columns={[
                  {
                    label: 'Servicio y actor',
                    render: (row) => (
                      <Link
                        to={`/credit-policies/${encodeURIComponent(row.id)}`}
                      >
                        {serviceLabel(row.serviceType)} ·{' '}
                        {actorLabel(row.actorType)}
                      </Link>
                    ),
                  },
                  { label: 'Versión', render: (row) => `v${row.version}` },
                  {
                    label: 'Estado',
                    render: (row) => (
                      <Badge
                        value={row.status}
                        label={policyStatusLabels[row.status]}
                      />
                    ),
                  },
                  {
                    label: 'Cálculo',
                    render: (row) => calculationLabel(row.calculationType),
                  },
                  { label: 'Costo', render: (row) => policySummary(row) },
                  {
                    label: 'Vigencia',
                    render: (row) =>
                      `${date(row.effectiveFrom)}${
                        row.effectiveUntil
                          ? ` · hasta ${date(row.effectiveUntil)}`
                          : ''
                      }`,
                  },
                ]}
              />
              <Pagination
                page={query.data.page}
                total={query.data.total}
                totalPages={query.data.totalPages}
                onPage={(value) => {
                  const next = new URLSearchParams(params)
                  next.set('page', String(value))
                  setParams(next)
                }}
              />
            </>
          )}
        </div>
      </section>
    </>
  )
}

/** Administrative check of what a service would cost. The result always comes from the backend. */
export function CreditCalculator() {
  const [input, setInput] = useState<{
    serviceType: ServiceType
    actorType: PolicyActorType
    distanceMeters: number
  } | null>(null)
  const query = useQuery({
    queryKey: policyKeys.calculation(input ?? {}),
    queryFn: ({ signal }) => creditPolicies.calculate(input!, signal),
    enabled: Boolean(input),
  })
  return (
    <section className="panel" aria-labelledby="credit-calculator">
      <div className="panel-toolbar">
        <div>
          <h2 id="credit-calculator">
            <Calculator size={18} aria-hidden="true" /> Calculadora de créditos
          </h2>
          <p>Consulta el costo con la política vigente. No cobra nada</p>
        </div>
      </div>
      <div className="panel-body">
        <ActionForm
          initialDirty
          submitLabel="Calcular"
          onSubmit={async (data) => {
            const distance = Number(
              String(data.get('distanceMeters') ?? '').trim(),
            )
            if (!Number.isInteger(distance) || distance < 0)
              throw new ApiError(400, 'Escribe la distancia en metros enteros.')
            if (distance > MAX_DISTANCE_METERS)
              throw new ApiError(400, 'La distancia excede el máximo admitido.')
            setInput({
              serviceType: String(data.get('serviceType')) as ServiceType,
              actorType: String(data.get('actorType')) as PolicyActorType,
              distanceMeters: distance,
            })
          }}
        >
          <Field label="Tipo de servicio">
            <select name="serviceType" defaultValue={serviceTypes[0]}>
              {serviceTypes.map((value) => (
                <option key={value} value={value}>
                  {serviceLabel(value)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Actor que paga">
            <select name="actorType" defaultValue="PROVIDER">
              {policyActorTypes.map((value) => (
                <option key={value} value={value}>
                  {actorTypeLabels[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Distancia en metros"
            hint="El contrato trabaja en metros enteros; los kilómetros son sólo para leer."
          >
            <input
              name="distanceMeters"
              type="number"
              min={0}
              step={1}
              defaultValue={4200}
              required
            />
          </Field>
        </ActionForm>
        {input &&
          (query.isPending ? (
            <Loading />
          ) : query.isError ? (
            <ErrorState
              error={query.error}
              retry={() => {
                void query.refetch()
              }}
            />
          ) : (
            <div className="credit-result">
              <strong className="credit-amount">
                {formatCredits(query.data.credits)}
              </strong>
              <InfoGrid
                items={[
                  ['Política', `v${query.data.policyVersion}`],
                  ['Cálculo', calculationLabel(query.data.calculationType)],
                  ['Distancia', formatDistance(query.data.distanceMeters)],
                  [
                    'Kilómetros cobrados',
                    query.data.billableKm === null
                      ? 'No aplica'
                      : `${query.data.billableKm}`,
                  ],
                  [
                    'Mínimo de la política',
                    query.data.minimumCredits === null
                      ? 'Sin mínimo'
                      : `${formatCredits(query.data.minimumCredits)}${
                          query.data.minimumApplied ? ' (aplicado)' : ''
                        }`,
                  ],
                  [
                    'Rango aplicado',
                    query.data.rangePosition === null
                      ? 'No aplica'
                      : `Rango ${query.data.rangePosition}`,
                  ],
                ]}
              />
              <p className="panel-note">
                Los créditos son una unidad interna de Mandaria: no son pesos ni
                sustituyen el cobro del envío.
              </p>
            </div>
          ))}
      </div>
    </section>
  )
}

function RangesEditor({
  ranges,
  onChange,
}: {
  ranges: { max: string; credits: string }[]
  onChange: (ranges: { max: string; credits: string }[]) => void
}) {
  return (
    <div className="ranges-editor">
      <p className="panel-note">
        Cada rango empieza donde termina el anterior; el primero empieza en 0 m
        y el último cubre cualquier distancia mayor.
      </p>
      {ranges.map((range, index) => {
        const last = index === ranges.length - 1
        return (
          <div className="range-row" key={index}>
            <Field label={`Rango ${index + 1}: hasta (metros)`}>
              <input
                type="number"
                min={1}
                step={1}
                max={MAX_DISTANCE_METERS}
                value={last ? '' : range.max}
                disabled={last}
                placeholder={last ? 'Sin límite' : ''}
                required={!last}
                onChange={(event) =>
                  onChange(
                    ranges.map((item, i) =>
                      i === index ? { ...item, max: event.target.value } : item,
                    ),
                  )
                }
              />
            </Field>
            <Field label={`Rango ${index + 1}: créditos`}>
              <input
                type="number"
                min={1}
                step={1}
                max={MAX_POLICY_CREDITS}
                value={range.credits}
                required
                onChange={(event) =>
                  onChange(
                    ranges.map((item, i) =>
                      i === index
                        ? { ...item, credits: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </Field>
            {ranges.length > 1 && (
              <button
                type="button"
                className="button secondary small"
                onClick={() => onChange(ranges.filter((_, i) => i !== index))}
              >
                Quitar rango {index + 1}
              </button>
            )}
          </div>
        )
      })}
      {ranges.length < MAX_POLICY_RANGES && (
        <button
          type="button"
          className="button secondary small"
          onClick={() => onChange([...ranges, { max: '', credits: '' }])}
        >
          Agregar rango
        </button>
      )}
    </div>
  )
}

/** Shared by the first policy and by each new version: only the chosen type's fields are sent. */
function PolicyFields({
  calculation,
  onCalculation,
  ranges,
  onRanges,
}: {
  calculation: CalculationType
  onCalculation: (value: CalculationType) => void
  ranges: { max: string; credits: string }[]
  onRanges: (ranges: { max: string; credits: string }[]) => void
}) {
  return (
    <>
      <Field label="Tipo de cálculo">
        <select
          name="calculationType"
          value={calculation}
          onChange={(event) =>
            onCalculation(event.target.value as CalculationType)
          }
        >
          {calculationTypes.map((value) => (
            <option key={value} value={value}>
              {calculationTypeLabels[value]}
            </option>
          ))}
        </select>
      </Field>
      {calculation === 'PER_KM' && (
        <>
          <Field
            label="Créditos por kilómetro"
            hint="Se cobra por kilómetro completo, según el motor del backend."
          >
            <input
              name="creditsPerKm"
              type="number"
              min={1}
              max={MAX_POLICY_CREDITS}
              step={1}
              required
            />
          </Field>
          <Field label="Créditos mínimos por servicio">
            <input
              name="minimumCredits"
              type="number"
              min={0}
              max={MAX_POLICY_CREDITS}
              step={1}
              defaultValue={0}
              required
            />
          </Field>
        </>
      )}
      {calculation === 'FLAT' && (
        <Field label="Créditos por servicio">
          <input
            name="flatCredits"
            type="number"
            min={1}
            max={MAX_POLICY_CREDITS}
            step={1}
            required
          />
        </Field>
      )}
      {calculation === 'DISTANCE_RANGE' && (
        <RangesEditor ranges={ranges} onChange={onRanges} />
      )}
      <Field
        label="Motivo (opcional)"
        hint={`Entre ${POLICY_REASON_MIN} y ${POLICY_REASON_MAX} caracteres. Queda en el historial de la política.`}
      >
        <textarea name="reason" rows={2} maxLength={POLICY_REASON_MAX} />
      </Field>
    </>
  )
}

function readVersion(
  data: FormData,
  calculation: CalculationType,
  ranges: { max: string; credits: string }[],
): PolicyVersionInput {
  const integer = (value: FormDataEntryValue | null, label: string) => {
    const parsed = Number(String(value ?? '').trim())
    if (!Number.isInteger(parsed))
      throw new ApiError(400, `${label} debe ser un número entero de créditos.`)
    return parsed
  }
  const reason = String(data.get('reason') ?? '').trim()
  if (reason && reason.length < POLICY_REASON_MIN)
    throw new ApiError(
      400,
      `El motivo debe tener entre ${POLICY_REASON_MIN} y ${POLICY_REASON_MAX} caracteres.`,
    )
  const base: PolicyVersionInput = {
    calculationType: calculation,
    ...(reason ? { reason } : {}),
  }
  if (calculation === 'PER_KM')
    return {
      ...base,
      creditsPerKm: integer(data.get('creditsPerKm'), 'Créditos por kilómetro'),
      minimumCredits: integer(data.get('minimumCredits'), 'Créditos mínimos'),
    }
  if (calculation === 'FLAT')
    return {
      ...base,
      flatCredits: integer(data.get('flatCredits'), 'Créditos por servicio'),
    }
  // Contiguous by construction: each range starts where the previous one ended and only the
  // last one is open ended, exactly as the backend requires.
  let min = 0
  const built: RangeInput[] = ranges.map((range, index) => {
    const last = index === ranges.length - 1
    const credits = Number(String(range.credits).trim())
    if (!Number.isInteger(credits) || credits < 1)
      throw new ApiError(
        400,
        `El rango ${index + 1} necesita créditos enteros.`,
      )
    const max = last ? null : Number(String(range.max).trim())
    if (max !== null && (!Number.isInteger(max) || max <= min))
      throw new ApiError(
        400,
        `El rango ${index + 1} debe terminar después de ${min} m.`,
      )
    const built = { minDistanceMeters: min, maxDistanceMeters: max, credits }
    min = max ?? min
    return built
  })
  return { ...base, ranges: built }
}

export function CreditPolicyNew() {
  const navigate = useNavigate()
  const notify = useFeedback()
  const [calculation, setCalculation] = useState<CalculationType>('PER_KM')
  const [ranges, setRanges] = useState([{ max: '', credits: '' }])
  return (
    <>
      <PageTitle
        title="Nueva política de créditos"
        description="Primera versión para una combinación de servicio y actor"
        back="/credit-policies"
      />
      <section className="panel">
        <div className="panel-body">
          <p className="modal-description">
            Si la combinación ya tiene política, Mandaria la rechaza: en ese
            caso crea una nueva versión desde la política vigente.
          </p>
          <ActionForm
            submitLabel="Crear política"
            onCancel={() => navigate('/credit-policies')}
            onSubmit={async (data) => {
              const policy = await creditPolicies.create({
                serviceType: String(data.get('serviceType')) as ServiceType,
                actorType: String(data.get('actorType')) as PolicyActorType,
                ...readVersion(data, calculation, ranges),
              })
              await refreshPolicies()
              notify('Política de créditos creada correctamente.')
              navigate(`/credit-policies/${policy.id}`)
            }}
          >
            <Field label="Tipo de servicio">
              <select name="serviceType" defaultValue={serviceTypes[0]}>
                {serviceTypes.map((value) => (
                  <option key={value} value={value}>
                    {serviceLabel(value)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Actor que paga">
              <select name="actorType" defaultValue="PROVIDER">
                {policyActorTypes.map((value) => (
                  <option key={value} value={value}>
                    {actorTypeLabels[value]}
                  </option>
                ))}
              </select>
            </Field>
            <PolicyFields
              calculation={calculation}
              onCalculation={setCalculation}
              ranges={ranges}
              onRanges={setRanges}
            />
          </ActionForm>
        </div>
      </section>
    </>
  )
}

function NewVersionDialog({
  policy,
  onClose,
}: {
  policy: CreditPolicy
  onClose: () => void
}) {
  const navigate = useNavigate()
  const notify = useFeedback()
  const [calculation, setCalculation] = useState<CalculationType>(
    policy.calculationType,
  )
  const [ranges, setRanges] = useState(
    policy.ranges.length
      ? policy.ranges.map((range) => ({
          max:
            range.maxDistanceMeters === null
              ? ''
              : String(range.maxDistanceMeters),
          credits: String(range.credits),
        }))
      : [{ max: '', credits: '' }],
  )
  return (
    <Modal title="Crear nueva versión" onClose={onClose}>
      <p className="modal-description">
        La versión vigente no se edita: queda como histórica y la nueva pasa a
        ser la vigente para {serviceLabel(policy.serviceType)} ·{' '}
        {actorLabel(policy.actorType)}.
      </p>
      <ActionForm
        submitLabel="Crear versión"
        cancelLabel="Cancelar"
        onCancel={onClose}
        onSubmit={async (data) => {
          const created = await creditPolicies.createVersion(
            policy.id,
            readVersion(data, calculation, ranges),
          )
          await refreshPolicies()
          notify(`Versión ${created.version} creada correctamente.`)
          onClose()
          navigate(`/credit-policies/${created.id}`)
        }}
      >
        <PolicyFields
          calculation={calculation}
          onCalculation={setCalculation}
          ranges={ranges}
          onRanges={setRanges}
        />
      </ActionForm>
    </Modal>
  )
}

export function CreditPolicyDetail() {
  const { id = '' } = useParams()
  const [versioning, setVersioning] = useState(false)
  const query = useQuery({
    queryKey: policyKeys.detail(id),
    queryFn: ({ signal }) => creditPolicies.get(id, signal),
  })
  const policy = query.data
  const history = useQuery({
    queryKey: policyKeys.list({
      serviceType: policy?.serviceType,
      actorType: policy?.actorType,
      pageSize: 50,
    }),
    queryFn: ({ signal }) =>
      creditPolicies.list(
        {
          serviceType: policy!.serviceType,
          actorType: policy!.actorType,
          pageSize: 50,
        },
        signal,
      ),
    enabled: Boolean(policy),
  })
  if (query.isPending) return <Loading />
  if (query.isError)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch()
        }}
      />
    )
  const current = query.data
  return (
    <>
      <PageTitle
        title={policyTitle(current)}
        description={policySummary(current)}
        back="/credit-policies"
        action={
          current.status === 'ACTIVE' ? (
            <button className="button" onClick={() => setVersioning(true)}>
              Crear nueva versión
            </button>
          ) : undefined
        }
      />
      <section className="panel" aria-labelledby="policy-version">
        <div className="panel-toolbar">
          <div>
            <h2 id="policy-version">Versión {current.version}</h2>
            <p>Una versión publicada no se edita ni se elimina</p>
          </div>
          <Badge
            value={current.status}
            label={policyStatusLabels[current.status]}
          />
        </div>
        <div className="panel-body">
          <InfoGrid
            items={[
              ['Tipo de servicio', serviceLabel(current.serviceType)],
              ['Actor que paga', actorLabel(current.actorType)],
              ['Cálculo', calculationLabel(current.calculationType)],
              [
                'Créditos por kilómetro',
                current.creditsPerKm === null
                  ? 'No aplica'
                  : formatCredits(current.creditsPerKm),
              ],
              [
                'Mínimo por servicio',
                current.minimumCredits === null
                  ? 'No aplica'
                  : formatCredits(current.minimumCredits),
              ],
              [
                'Créditos fijos',
                current.flatCredits === null
                  ? 'No aplica'
                  : formatCredits(current.flatCredits),
              ],
              ['Vigente desde', date(current.effectiveFrom)],
              [
                'Vigente hasta',
                current.effectiveUntil
                  ? date(current.effectiveUntil)
                  : 'Sigue vigente',
              ],
              ['Motivo', current.reason ?? 'Sin motivo registrado'],
              ['Creada por', current.createdByUserId],
            ]}
          />
          {current.ranges.length > 0 && (
            <Table
              stacked
              rows={current.ranges}
              columns={[
                { label: 'Rango', render: (row) => `Rango ${row.position}` },
                { label: 'Distancia', render: (row) => rangeLabel(row) },
                {
                  label: 'Costo',
                  render: (row) => formatCredits(row.credits),
                },
              ]}
            />
          )}
          {current.status === 'INACTIVE' && (
            <p className="panel-note">
              Esta versión es histórica: se conserva tal como se publicó. Para
              cambiar las condiciones, crea una nueva versión desde la vigente.
            </p>
          )}
        </div>
      </section>
      <section className="panel" aria-labelledby="policy-history">
        <div className="panel-toolbar">
          <div>
            <h2 id="policy-history">
              <History size={18} aria-hidden="true" /> Historial de versiones
            </h2>
            <p>
              {serviceLabel(current.serviceType)} ·{' '}
              {actorLabel(current.actorType)}
            </p>
          </div>
        </div>
        <div className="panel-body">
          {history.isPending ? (
            <Loading />
          ) : history.isError ? (
            <ErrorState
              error={history.error}
              retry={() => {
                void history.refetch()
              }}
            />
          ) : history.data.items.length ? (
            <Table
              stacked
              rows={history.data.items}
              columns={[
                {
                  label: 'Versión',
                  render: (row) =>
                    row.id === current.id ? (
                      `v${row.version} (esta versión)`
                    ) : (
                      <Link
                        to={`/credit-policies/${encodeURIComponent(row.id)}`}
                      >
                        v{row.version}
                      </Link>
                    ),
                },
                {
                  label: 'Estado',
                  render: (row) => (
                    <Badge
                      value={row.status}
                      label={policyStatusLabels[row.status]}
                    />
                  ),
                },
                { label: 'Costo', render: (row) => policySummary(row) },
                {
                  label: 'Vigencia',
                  render: (row) =>
                    `${date(row.effectiveFrom)}${
                      row.effectiveUntil
                        ? ` · hasta ${date(row.effectiveUntil)}`
                        : ''
                    }`,
                },
                { label: 'Motivo', render: (row) => row.reason ?? '—' },
              ]}
            />
          ) : (
            <Empty title="Sin historial disponible." />
          )}
        </div>
      </section>
      {versioning && (
        <NewVersionDialog
          policy={current}
          onClose={() => setVersioning(false)}
        />
      )}
    </>
  )
}
