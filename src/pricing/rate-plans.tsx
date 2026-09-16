import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LoaderCircle, Plus, Trash2 } from 'lucide-react'
import {
  ActionForm,
  Badge,
  Confirm,
  Empty,
  ErrorPage,
  ErrorState,
  Field,
  InfoGrid,
  Loading,
  PageTitle,
  Table,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { queryClient } from '../services/query'
import { ApiError, errorMessage } from '../services/errors'
import { date } from '../utils/format'
import { ratePlans } from './service'
import { ratePlanKeys, zoneKeys } from './queries'
import {
  NOT_PROVIDED,
  amountFrom,
  bandErrors,
  km,
  kmValue,
  metersFrom,
  money,
  ratePlanStatusLabels,
  serviceTypeLabels,
  validityText,
  zoneStatusLabels,
} from './format'
import { UUID } from './zones'
import {
  MAX_BANDS,
  QUOTE_VALIDITY,
  type RateBandInput,
  type RatePlan,
} from './types'

const invalidate = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ratePlanKeys.all }),
    queryClient.invalidateQueries({ queryKey: zoneKeys.all }),
  ])
const TTL_NOTE =
  'Este tiempo determina cuánto tiempo puede aceptarse el precio. No determina cuándo se realizará el servicio.'

export function RatePlanDetail() {
  const { id = '' } = useParams()
  if (!UUID.test(id)) return <ErrorPage code={404} />
  return <RatePlanRecord key={id} id={id} />
}
function RatePlanRecord({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ratePlanKeys.detail(id),
    queryFn: ({ signal }) => ratePlans.get(id, signal),
    staleTime: 0,
  })
  if (query.isPending || query.isError)
    return (
      <>
        <PageTitle title="Tarifa" back="/service-zones" />
        {query.isPending ? (
          <Loading />
        ) : (
          <ErrorState
            error={query.error}
            retry={() => {
              void query.refetch()
            }}
          />
        )}
      </>
    )
  return <RatePlanContent plan={query.data} />
}

function RatePlanContent({ plan }: { plan: RatePlan }) {
  const navigate = useNavigate()
  const notify = useFeedback()
  const [activating, setActivating] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [cloning, setCloning] = useState(false)
  const draft = plan.status === 'DRAFT'
  const zoneLink = `/service-zones/${encodeURIComponent(plan.serviceZoneId)}`
  const store = (result: RatePlan) => {
    queryClient.setQueryData(ratePlanKeys.detail(plan.id), result)
    return invalidate()
  }
  return (
    <>
      <PageTitle
        title={`Versión ${plan.version}`}
        description={`${plan.serviceZone.name} · ${serviceTypeLabels[plan.serviceType]}`}
        back={zoneLink}
        action={
          draft ? (
            <button className="button" onClick={() => setActivating(true)}>
              Activar tarifa
            </button>
          ) : (
            <div className="row-actions">
              {plan.status === 'ACTIVE' && (
                <button
                  className="button secondary destructive"
                  onClick={() => setDeactivating(true)}
                >
                  Desactivar tarifa
                </button>
              )}
              <button className="button" onClick={() => setCloning(true)}>
                Crear nueva versión
              </button>
            </div>
          )
        }
      />
      <section className="panel" aria-labelledby="plan-summary">
        <div className="panel-toolbar">
          <h2 id="plan-summary">Resumen</h2>
        </div>
        <InfoGrid
          items={[
            [
              'Estado',
              <Badge
                value={plan.status}
                label={ratePlanStatusLabels[plan.status]}
              />,
            ],
            [
              'Zona',
              <Link className="entity-name" to={zoneLink}>
                {plan.serviceZone.name}
                <small>
                  {plan.serviceZone.code} ·{' '}
                  {zoneStatusLabels[plan.serviceZone.status]}
                </small>
              </Link>,
            ],
            ['Servicio', serviceTypeLabels[plan.serviceType]],
            ['Cálculo', 'Bandas de distancia'],
            ['Moneda', plan.currency],
            ['Creación', date(plan.createdAt)],
            [
              'Activa desde',
              plan.activatedAt ? date(plan.activatedAt) : NOT_PROVIDED,
            ],
            [
              'Sustituida',
              plan.deactivatedAt ? date(plan.deactivatedAt) : NOT_PROVIDED,
            ],
          ]}
        />
        <p className="panel-note">
          {draft
            ? 'Este borrador todavía no se aplica a ninguna cotización. Sólo los borradores pueden editarse.'
            : plan.status === 'ACTIVE'
              ? 'Esta versión se aplica a las cotizaciones nuevas. Para cambiarla, crea una nueva versión.'
              : 'Versión histórica, de sólo lectura. Las cotizaciones que la usaron conservan su precio.'}
        </p>
      </section>
      <ValidityPanel plan={plan} onSaved={store} />
      {draft ? (
        <BandEditor plan={plan} onSaved={store} />
      ) : (
        <BandsPanel plan={plan} />
      )}
      {draft && <ValidationPanel plan={plan} />}
      {activating && (
        <Confirm
          title="Activar tarifa"
          label="Activar versión"
          description={`Al activar la versión ${plan.version}, dejará de utilizarse la tarifa activa actual para nuevas cotizaciones. Las cotizaciones existentes no cambiarán.`}
          onClose={() => setActivating(false)}
          onConfirm={async () => {
            await store(await ratePlans.transition(plan.id, 'activate'))
            notify(`Versión ${plan.version} activada.`)
          }}
        />
      )}
      {deactivating && (
        <Confirm
          title="Desactivar tarifa"
          label="Desactivar versión"
          description={`La zona ${plan.serviceZone.name} quedará sin tarifa activa y las cotizaciones nuevas fallarán hasta que se active otra versión. Las cotizaciones existentes no cambiarán.`}
          onClose={() => setDeactivating(false)}
          onConfirm={async () => {
            await store(await ratePlans.transition(plan.id, 'deactivate'))
            notify(`Versión ${plan.version} desactivada.`)
          }}
        />
      )}
      {cloning && (
        <Confirm
          title="Crear nueva versión"
          label="Crear borrador"
          description={`Se copiarán la vigencia y las bandas de la versión ${plan.version} en una nueva versión en borrador. Esta versión no cambia.`}
          onClose={() => setCloning(false)}
          onConfirm={async () => {
            const created = await ratePlans.clone(plan.id)
            await invalidate()
            notify(`Versión ${created.version} creada como borrador.`)
            navigate(`/rate-plans/${created.id}`)
          }}
        />
      )}
    </>
  )
}

function ValidityPanel({
  plan,
  onSaved,
}: {
  plan: RatePlan
  onSaved: (plan: RatePlan) => Promise<unknown>
}) {
  const notify = useFeedback()
  const draft = plan.status === 'DRAFT'
  return (
    <section className="panel" aria-labelledby="plan-validity">
      <div className="panel-toolbar">
        <div>
          <h2 id="plan-validity">Vigencia de cotización</h2>
          <p>{validityText(plan.quoteValidityMinutes)}</p>
        </div>
      </div>
      {draft ? (
        <div className="panel-body">
          <ActionForm
            submitLabel="Guardar vigencia"
            onSubmit={async (data) => {
              const minutes = Number(data.get('quoteValidityMinutes'))
              if (
                !Number.isInteger(minutes) ||
                minutes < QUOTE_VALIDITY.min ||
                minutes > QUOTE_VALIDITY.max
              )
                throw new ApiError(
                  400,
                  `La vigencia debe ser un número entero de ${QUOTE_VALIDITY.min} a ${QUOTE_VALIDITY.max} minutos.`,
                )
              await onSaved(await ratePlans.updateValidity(plan.id, minutes))
              notify('Vigencia actualizada.')
            }}
          >
            <Field
              label="Minutos"
              hint={`De ${QUOTE_VALIDITY.min} a ${QUOTE_VALIDITY.max} minutos para entrega local; recomendado ${QUOTE_VALIDITY.recommended}.`}
            >
              <input
                name="quoteValidityMinutes"
                type="number"
                required
                min={QUOTE_VALIDITY.min}
                max={QUOTE_VALIDITY.max}
                step={1}
                defaultValue={plan.quoteValidityMinutes}
              />
            </Field>
          </ActionForm>
        </div>
      ) : (
        <InfoGrid
          items={[['Vigencia', validityText(plan.quoteValidityMinutes)]]}
        />
      )}
      <p className="panel-note">{TTL_NOTE}</p>
    </section>
  )
}

const sorted = (plan: RatePlan) =>
  [...plan.bands].sort((a, b) => a.minDistanceMeters - b.minDistanceMeters)

function BandsPanel({ plan }: { plan: RatePlan }) {
  const rows = sorted(plan)
  return (
    <section className="panel" aria-labelledby="plan-bands">
      <div className="panel-toolbar">
        <div>
          <h2 id="plan-bands">Bandas de distancia</h2>
          <p>Rango [desde, hasta) por distancia de ruta real</p>
        </div>
      </div>
      {rows.length ? (
        <Table
          stacked
          rows={rows}
          columns={[
            { label: 'Desde', render: (row) => km(row.minDistanceMeters) },
            { label: 'Hasta', render: (row) => km(row.maxDistanceMeters) },
            {
              label: 'Precio',
              render: (row) => money(row.amount, row.currency),
            },
          ]}
        />
      ) : (
        <Empty
          title="Sin bandas"
          description="Esta versión no tiene bandas de distancia configuradas."
        />
      )}
      <p className="panel-note">
        El límite inferior es inclusivo y el superior exclusivo. La distancia
        máxima cotizable es el final de la última banda.
      </p>
    </section>
  )
}

type Row = { key: number; min: string; max: string; amount: string }
let nextKey = 0
const rowFrom = (band: {
  minDistanceMeters: number
  maxDistanceMeters: number
  amount: string
}): Row => ({
  key: nextKey++,
  min: kmValue(band.minDistanceMeters),
  max: kmValue(band.maxDistanceMeters),
  amount: band.amount,
})

/**
 * Kilometres are for people; the API only receives the integer metres of RateBandDto. Local
 * checks catch unusable values early, but the backend stays the authority on gaps and overlaps.
 */
function BandEditor({
  plan,
  onSaved,
}: {
  plan: RatePlan
  onSaved: (plan: RatePlan) => Promise<unknown>
}) {
  const notify = useFeedback()
  const [rows, setRows] = useState<Row[]>(() => sorted(plan).map(rowFrom))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [issues, setIssues] = useState<string[]>([])
  const set = (key: number, field: keyof Omit<Row, 'key'>, value: string) =>
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, [field]: value } : row,
      ),
    )
  function addRow() {
    setRows((current) => {
      const last = current.at(-1)
      return [
        ...current,
        { key: nextKey++, min: last ? last.max : '0', max: '', amount: '' },
      ]
    })
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError(null)
    setIssues([])
    const bands: RateBandInput[] = []
    for (const row of rows) {
      const min = metersFrom(row.min)
      const max = metersFrom(row.max)
      const amount = amountFrom(row.amount)
      if (min === null || max === null) {
        setError(
          new ApiError(
            400,
            'Las distancias deben expresarse en kilómetros, con hasta 3 decimales.',
          ),
        )
        return
      }
      if (max <= min) {
        setError(
          new ApiError(
            400,
            'En cada banda la distancia final debe ser mayor que la inicial.',
          ),
        )
        return
      }
      if (amount === null) {
        setError(
          new ApiError(
            400,
            'El precio debe ser mayor que cero, con hasta 2 decimales.',
          ),
        )
        return
      }
      bands.push({
        minDistanceMeters: min,
        maxDistanceMeters: max,
        amount,
      })
    }
    setBusy(true)
    try {
      const result = await ratePlans.replaceBands(plan.id, bands)
      await onSaved(result)
      setRows(sorted(result).map(rowFrom))
      notify('Bandas guardadas.')
    } catch (err) {
      setError(err)
      if (err instanceof ApiError) setIssues(bandErrors(err.details))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="panel" aria-labelledby="plan-bands">
      <div className="panel-toolbar">
        <div>
          <h2 id="plan-bands">Bandas de distancia</h2>
          <p>Rango [desde, hasta) por distancia de ruta real, en kilómetros</p>
        </div>
      </div>
      <form
        className="band-editor"
        onSubmit={(event) => {
          void submit(event)
        }}
        aria-label="Editor de bandas"
      >
        <fieldset disabled={busy}>
          {rows.length ? (
            <ol className="band-rows">
              <li className="band-head" aria-hidden="true">
                <span>Desde (km)</span>
                <span>Hasta (km)</span>
                <span>Precio ({plan.currency})</span>
                <span />
              </li>
              {rows.map((row, index) => (
                <li key={row.key} className="band-row">
                  <input
                    aria-label={`Banda ${index + 1}: desde, en kilómetros`}
                    inputMode="decimal"
                    value={row.min}
                    onChange={(event) =>
                      set(row.key, 'min', event.target.value)
                    }
                  />
                  <input
                    aria-label={`Banda ${index + 1}: hasta, en kilómetros`}
                    inputMode="decimal"
                    value={row.max}
                    onChange={(event) =>
                      set(row.key, 'max', event.target.value)
                    }
                  />
                  <input
                    aria-label={`Banda ${index + 1}: precio en ${plan.currency}`}
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(event) =>
                      set(row.key, 'amount', event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Quitar banda ${index + 1}`}
                    onClick={() =>
                      setRows((current) =>
                        current.filter((item) => item.key !== row.key),
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <Empty
              title="Sin bandas todavía"
              description="Agrega la primera banda, desde 0 km, para poder activar esta versión."
            />
          )}
        </fieldset>
        {!!error && (
          <p className="inline-error" role="alert">
            {errorMessage(error)}
          </p>
        )}
        {issues.length > 0 && (
          <ul className="band-issues" role="alert">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy || rows.length >= MAX_BANDS}
            onClick={addRow}
          >
            <Plus size={16} /> Agregar banda
          </button>
          <button className="button" type="submit" disabled={busy}>
            {busy && <LoaderCircle size={16} className="spin" />}
            {busy ? 'Guardando…' : 'Guardar bandas'}
          </button>
        </div>
      </form>
      <p className="panel-note">
        El límite inferior es inclusivo y el superior exclusivo. Se guardan en
        metros: 2 km se envían como 2000. Hasta {MAX_BANDS} bandas por versión.
      </p>
    </section>
  )
}

/** POST /validate only reports; it never modifies the plan, so it is read here as a query. */
function ValidationPanel({ plan }: { plan: RatePlan }) {
  const query = useQuery({
    queryKey: [...ratePlanKeys.detail(plan.id), 'validation', plan.updatedAt],
    queryFn: ({ signal }) => ratePlans.validate(plan.id, signal),
    staleTime: 0,
  })
  return (
    <section className="panel" aria-labelledby="plan-validation">
      <div className="panel-toolbar">
        <div>
          <h2 id="plan-validation">Validación</h2>
          <p>Comprobación del backend antes de activar</p>
        </div>
        <button
          className="button secondary small"
          disabled={query.isFetching}
          onClick={() => {
            void query.refetch()
          }}
        >
          Volver a validar
        </button>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch()
          }}
        />
      ) : query.data.valid ? (
        <div className="panel-body">
          <p className="notice">
            Las bandas cubren la distancia de forma continua desde 0 km. Esta
            versión puede activarse.
          </p>
        </div>
      ) : (
        <div className="panel-body">
          <ul className="band-issues" role="alert">
            {bandErrors(query.data.errors).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="panel-note">
        La activación vuelve a validar en el backend: es la autoridad final.
      </p>
    </section>
  )
}
