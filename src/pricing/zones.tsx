import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Search } from 'lucide-react'
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
  Modal,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { queryClient } from '../services/query'
import { ApiError } from '../services/errors'
import { date } from '../utils/format'
import { ratePlans, serviceZones } from './service'
import { ratePlanKeys, zoneKeys } from './queries'
import {
  NOT_PROVIDED,
  boundaryText,
  km,
  money,
  parseBoundary,
  positionCount,
  ratePlanStatusLabels,
  serviceTypeLabels,
  validityText,
  zoneStatusLabels,
} from './format'
import {
  QUOTE_VALIDITY,
  serviceZoneStatuses,
  type RatePlan,
  type ServiceZone,
} from './types'

const PAGE_SIZE = 20
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CODE = /^[A-Z][A-Z0-9_]{1,49}$/
const CURRENCY = /^[A-Z]{3}$/
const invalidate = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: zoneKeys.all }),
    queryClient.invalidateQueries({ queryKey: ratePlanKeys.all }),
  ])

export function ServiceZonesPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(
    1,
    Math.min(100000, Math.trunc(Number(params.get('page')) || 1)),
  )
  const search = params.get('search') ?? ''
  const status = params.get('status') ?? ''
  const valid =
    search.length <= 100 &&
    (!status || (serviceZoneStatuses as readonly string[]).includes(status))
  const filters = {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: status || undefined,
  }
  const query = useQuery({
    queryKey: zoneKeys.list(filters),
    queryFn: ({ signal }) => serviceZones.list(filters, signal),
    enabled: valid,
  })
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setParams(next)
  }
  return (
    <>
      <PageTitle
        title="Zonas de servicio"
        description="Dónde puede operar Mandaria. Cada zona define su cobertura y su moneda."
        action={
          <Link className="button" to="/service-zones/new">
            Nueva zona
          </Link>
        }
      />
      <div className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>Cobertura configurada</h2>
            <p>Ordenadas por código</p>
          </div>
        </div>
        <ZoneFilters
          search={search}
          status={status}
          onSearch={(value) => update('search', value)}
          onStatus={(value) => update('status', value)}
        />
        {!valid ? (
          <div className="panel-body">
            <p className="inline-error" role="alert">
              Revisa los filtros: la búsqueda admite hasta 100 caracteres.
            </p>
          </div>
        ) : query.isPending ? (
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
            {query.data.items.length ? (
              <Table
                stacked
                rows={query.data.items}
                columns={[
                  {
                    label: 'Zona',
                    render: (row) => (
                      <Link
                        className="entity-name"
                        to={`/service-zones/${encodeURIComponent(row.id)}`}
                      >
                        {row.name}
                        <small>{row.code}</small>
                      </Link>
                    ),
                  },
                  {
                    label: 'Estado',
                    render: (row) => (
                      <Badge
                        value={row.status}
                        label={zoneStatusLabels[row.status]}
                      />
                    ),
                  },
                  { label: 'Moneda', render: (row) => row.currency },
                  {
                    label: 'Tarifa activa',
                    render: (row) => <ActiveRateCell zoneId={row.id} />,
                  },
                  {
                    label: 'Acciones',
                    render: (row) => (
                      <Link
                        className="table-action"
                        to={`/service-zones/${encodeURIComponent(row.id)}`}
                        aria-label={`Ver detalle de ${row.name}`}
                      >
                        Ver detalle <ArrowUpRight size={15} />
                      </Link>
                    ),
                  },
                ]}
              />
            ) : (
              <Empty
                title="No hay zonas de servicio."
                description={
                  search || status
                    ? 'Ninguna zona coincide con los filtros aplicados.'
                    : 'Crea una zona para definir dónde opera Mandaria.'
                }
              />
            )}
            <Pagination
              page={page}
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
    </>
  )
}

/** The list endpoint does not embed rate plans; the active LOCAL_DELIVERY plan is read apart. */
function ActiveRateCell({ zoneId }: { zoneId: string }) {
  const filters = {
    serviceZoneId: zoneId,
    serviceType: 'LOCAL_DELIVERY',
    status: 'ACTIVE',
    page: 1,
    pageSize: 1,
  }
  const query = useQuery({
    queryKey: ratePlanKeys.list(filters),
    queryFn: ({ signal }) => ratePlans.list(filters, signal),
  })
  if (query.isPending) return <span className="muted">Cargando…</span>
  if (query.isError) return <span className="muted">No disponible</span>
  const plan = query.data.items[0]
  if (!plan) return <span className="muted">Sin tarifa activa</span>
  return (
    <Link
      className="entity-name"
      to={`/rate-plans/${encodeURIComponent(plan.id)}`}
    >
      Entrega local · v{plan.version}
      <small>Vigencia {validityText(plan.quoteValidityMinutes)}</small>
    </Link>
  )
}

function ZoneFilters({
  search,
  status,
  onSearch,
  onStatus,
}: {
  search: string
  status: string
  onSearch: (value: string) => void
  onStatus: (value: string) => void
}) {
  const [draft, setDraft] = useState(search)
  const [seen, setSeen] = useState(search)
  if (seen !== search) {
    setSeen(search)
    setDraft(search)
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(draft.trim())
  }
  return (
    <form className="filters" onSubmit={submit} aria-label="Filtros de zonas">
      <label className="search">
        <Search size={17} />
        <input
          aria-label="Buscar zona"
          placeholder="Código o nombre"
          value={draft}
          maxLength={100}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      <select
        aria-label="Filtrar por estado"
        value={status}
        onChange={(event) => onStatus(event.target.value)}
      >
        <option value="">Todos los estados</option>
        {serviceZoneStatuses.map((value) => (
          <option key={value} value={value}>
            {zoneStatusLabels[value]}
          </option>
        ))}
      </select>
      <div className="row-actions">
        <button className="button small" type="submit">
          Buscar
        </button>
      </div>
    </form>
  )
}

const SAMPLE_BOUNDARY = [
  '{',
  '  "type": "Polygon",',
  '  "coordinates": [',
  '    [',
  '      [-93.41, 16.735],',
  '      [-93.34, 16.735],',
  '      [-93.34, 16.79],',
  '      [-93.41, 16.79],',
  '      [-93.41, 16.735]',
  '    ]',
  '  ]',
  '}',
].join('\n')

export function ServiceZoneNew() {
  const navigate = useNavigate()
  const notify = useFeedback()
  return (
    <>
      <PageTitle
        title="Nueva zona de servicio"
        description="Define el área donde Mandaria puede cotizar entregas locales."
        back="/service-zones"
      />
      <div className="panel form-panel">
        <h2>Información de la zona</h2>
        <ActionForm
          submitLabel="Crear zona"
          onSubmit={async (data) => {
            const code = String(data.get('code') ?? '')
              .trim()
              .toUpperCase()
            const name = String(data.get('name') ?? '').trim()
            const currency = String(data.get('currency') ?? '')
              .trim()
              .toUpperCase()
            const boundary = parseBoundary(String(data.get('boundary') ?? ''))
            if (!CODE.test(code))
              throw new ApiError(
                400,
                'El código debe empezar con una letra mayúscula y usar A-Z, 0-9 o guion bajo (2 a 50 caracteres).',
              )
            if (!name || name.length > 100)
              throw new ApiError(400, 'El nombre admite de 1 a 100 caracteres.')
            if (!CURRENCY.test(currency))
              throw new ApiError(
                400,
                'La moneda debe ser un código ISO 4217 de tres letras, por ejemplo MXN.',
              )
            if (!boundary)
              throw new ApiError(
                400,
                'La cobertura debe ser un GeoJSON Polygon o MultiPolygon con coordenadas [longitud, latitud].',
              )
            const zone = await serviceZones.create({
              code,
              name,
              currency,
              boundary,
            })
            void invalidate()
            notify(
              'Zona creada. Nace inactiva: actívala cuando su cobertura sea definitiva.',
            )
            navigate(`/service-zones/${zone.id}`)
          }}
        >
          <div className="form-grid">
            <Field
              label="Código"
              hint="Mayúsculas, números y guion bajo. No puede cambiarse después."
            >
              <input name="code" required maxLength={50} />
            </Field>
            <Field label="Nombre" hint="Hasta 100 caracteres.">
              <input name="name" required maxLength={100} />
            </Field>
            <Field
              label="Moneda"
              hint="ISO 4217. Inmutable: las tarifas de la zona la heredan."
            >
              <input
                name="currency"
                required
                maxLength={3}
                defaultValue="MXN"
              />
            </Field>
          </div>
          <Field
            label="Cobertura (GeoJSON)"
            hint="Polygon o MultiPolygon en orden [longitud, latitud], con el anillo cerrado. Máximo 10000 posiciones."
          >
            <textarea
              name="boundary"
              required
              rows={12}
              spellCheck={false}
              className="geojson-input"
              defaultValue={SAMPLE_BOUNDARY}
            />
          </Field>
          <p className="notice">
            La zona se creará inactiva. Al activarla, Mandaria comprueba que su
            cobertura no toque ni se superponga con otra zona activa.
          </p>
        </ActionForm>
      </div>
    </>
  )
}

export function ServiceZoneDetail() {
  const { id = '' } = useParams()
  if (!UUID.test(id)) return <ErrorPage code={404} />
  return <ZoneRecord key={id} id={id} />
}
function ZoneRecord({ id }: { id: string }) {
  const query = useQuery({
    queryKey: zoneKeys.detail(id),
    queryFn: ({ signal }) => serviceZones.get(id, signal),
    staleTime: 0,
  })
  if (query.isPending || query.isError)
    return (
      <>
        <PageTitle title="Zona de servicio" back="/service-zones" />
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
  return <ZoneContent zone={query.data} />
}

function ZoneContent({ zone }: { zone: ServiceZone }) {
  const notify = useFeedback()
  const [renaming, setRenaming] = useState(false)
  const [boundaryOpen, setBoundaryOpen] = useState(false)
  const [transition, setTransition] = useState<
    'activate' | 'deactivate' | null
  >(null)
  const active = zone.status === 'ACTIVE'
  async function apply(action: 'activate' | 'deactivate') {
    const result = await serviceZones.transition(zone.id, action)
    queryClient.setQueryData(zoneKeys.detail(zone.id), result)
    await invalidate()
    notify(
      action === 'activate'
        ? 'Zona activada. Las nuevas cotizaciones dentro de su cobertura ya pueden calcularse.'
        : 'Zona desactivada. Las cotizaciones existentes conservan su precio.',
    )
  }
  return (
    <>
      <PageTitle
        title={zone.name}
        description={`${zone.code} · ${zone.currency}`}
        back="/service-zones"
        action={
          <button
            className={`button${active ? ' secondary' : ''}`}
            onClick={() => setTransition(active ? 'deactivate' : 'activate')}
          >
            {active ? 'Desactivar zona' : 'Activar zona'}
          </button>
        }
      />
      <section className="panel" aria-labelledby="zone-summary">
        <div className="panel-toolbar">
          <h2 id="zone-summary">Resumen</h2>
          <button
            className="button secondary small"
            onClick={() => setRenaming(true)}
          >
            Cambiar nombre
          </button>
        </div>
        <InfoGrid
          items={[
            [
              'Estado',
              <Badge
                value={zone.status}
                label={zoneStatusLabels[zone.status]}
              />,
            ],
            ['Moneda', zone.currency],
            ['Código', <code className="id-code">{zone.code}</code>],
            ['Creación', date(zone.createdAt)],
            ['Última actualización', date(zone.updatedAt)],
          ]}
        />
        <p className="panel-note">
          El código y la moneda son inmutables. Una zona inactiva no genera
          cotizaciones nuevas; las emitidas conservan su precio.
        </p>
      </section>
      <BoundaryPanel zone={zone} onEdit={() => setBoundaryOpen(true)} />
      <ZoneRatePlans zone={zone} />
      {renaming && (
        <RenameDialog zone={zone} onClose={() => setRenaming(false)} />
      )}
      {boundaryOpen && (
        <BoundaryDialog zone={zone} onClose={() => setBoundaryOpen(false)} />
      )}
      {transition && (
        <Confirm
          title={active ? 'Desactivar zona' : 'Activar zona'}
          label={active ? 'Desactivar' : 'Activar'}
          description={
            active
              ? `Mientras ${zone.name} esté inactiva, las nuevas cotizaciones dentro de su cobertura fallarán por falta de cobertura. Las cotizaciones ya emitidas no cambian.`
              : `Al activar ${zone.name}, Mandaria comprobará que su cobertura no toque ni se superponga con otra zona activa. Se necesita además una tarifa activa para poder cotizar.`
          }
          onClose={() => setTransition(null)}
          onConfirm={() => apply(transition)}
        />
      )}
    </>
  )
}

function BoundaryPanel({
  zone,
  onEdit,
}: {
  zone: ServiceZone
  onEdit: () => void
}) {
  const boundary = zone.boundary ?? null
  const editable = zone.status === 'INACTIVE'
  return (
    <section className="panel" aria-labelledby="zone-boundary">
      <div className="panel-toolbar">
        <div>
          <h2 id="zone-boundary">Cobertura</h2>
          <p>Área servida, en GeoJSON [longitud, latitud]</p>
        </div>
        {editable && (
          <button className="button secondary small" onClick={onEdit}>
            Reemplazar cobertura
          </button>
        )}
      </div>
      <InfoGrid
        items={[
          ['Geometría', boundary ? boundary.type : NOT_PROVIDED],
          [
            'Posiciones',
            boundary
              ? positionCount(boundary).toLocaleString('es-MX')
              : NOT_PROVIDED,
          ],
          [
            'Latitud',
            `${zone.minLatitude.toFixed(6)} … ${zone.maxLatitude.toFixed(6)}`,
          ],
          [
            'Longitud',
            `${zone.minLongitude.toFixed(6)} … ${zone.maxLongitude.toFixed(6)}`,
          ],
        ]}
      />
      {boundary ? (
        <div className="panel-body">
          <pre className="geojson-view" aria-label="GeoJSON de la cobertura">
            {boundaryText(boundary)}
          </pre>
        </div>
      ) : (
        <Empty
          title="Sin cobertura disponible"
          description="El backend no devolvió la geometría de esta zona."
        />
      )}
      <p className="panel-note">
        {editable
          ? 'Mandaria Web no es un editor cartográfico: la geometría se reemplaza completa y el backend la valida.'
          : 'La cobertura sólo puede reemplazarse con la zona inactiva, para que un área activa no se mueva bajo cotizaciones abiertas.'}
      </p>
    </section>
  )
}

function ZoneRatePlans({ zone }: { zone: ServiceZone }) {
  const navigate = useNavigate()
  const notify = useFeedback()
  const [creating, setCreating] = useState(false)
  const filters = {
    serviceZoneId: zone.id,
    serviceType: 'LOCAL_DELIVERY',
    page: 1,
    pageSize: PAGE_SIZE,
  }
  const query = useQuery({
    queryKey: ratePlanKeys.list(filters),
    queryFn: ({ signal }) => ratePlans.list(filters, signal),
  })
  const items = query.data?.items ?? []
  const active = items.find((plan) => plan.status === 'ACTIVE')
  const draft = items.find((plan) => plan.status === 'DRAFT')
  async function createVersion() {
    // Cloning the ACTIVE version keeps its bands; without one, the first DRAFT starts empty.
    const plan = active
      ? await ratePlans.clone(active.id)
      : await ratePlans.create({
          serviceZoneId: zone.id,
          serviceType: 'LOCAL_DELIVERY',
          quoteValidityMinutes: QUOTE_VALIDITY.recommended,
        })
    await invalidate()
    notify(`Versión ${plan.version} creada como borrador.`)
    navigate(`/rate-plans/${plan.id}`)
  }
  return (
    <section className="panel" aria-labelledby="zone-rate-plans">
      <div className="panel-toolbar">
        <div>
          <h2 id="zone-rate-plans">{serviceTypeLabels.LOCAL_DELIVERY}</h2>
          <p>Versiones de tarifa de esta zona</p>
        </div>
        {!draft && (
          <button
            className="button secondary small"
            disabled={query.isPending}
            onClick={() => setCreating(true)}
          >
            Crear nueva versión
          </button>
        )}
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
      ) : (
        <>
          {active ? (
            <InfoGrid
              items={[
                ['Tarifa activa', `Versión ${active.version}`],
                ['Activa desde', date(active.activatedAt)],
                [
                  'Vigencia de cotización',
                  validityText(active.quoteValidityMinutes),
                ],
                ['Bandas', String(active.bands.length)],
              ]}
            />
          ) : (
            <div className="panel-body">
              <p className="warning" role="status">
                No hay tarifa activa. Las cotizaciones de esta zona fallarán
                hasta que se active una versión.
              </p>
            </div>
          )}
          {items.length ? (
            <Table
              stacked
              rows={items}
              columns={[
                {
                  label: 'Versión',
                  render: (row) => (
                    <Link
                      className="entity-name"
                      to={`/rate-plans/${encodeURIComponent(row.id)}`}
                    >
                      Versión {row.version}
                      <small>{serviceTypeLabels[row.serviceType]}</small>
                    </Link>
                  ),
                },
                {
                  label: 'Estado',
                  render: (row) => (
                    <Badge
                      value={row.status}
                      label={ratePlanStatusLabels[row.status]}
                    />
                  ),
                },
                { label: 'Bandas', render: (row) => String(row.bands.length) },
                {
                  label: 'Vigencia',
                  render: (row) => validityText(row.quoteValidityMinutes),
                },
                {
                  label: 'Precio inicial',
                  render: (row) => <FirstBandCell plan={row} />,
                },
                {
                  label: 'Activa desde',
                  render: (row) =>
                    row.activatedAt ? date(row.activatedAt) : NOT_PROVIDED,
                },
              ]}
            />
          ) : (
            <Empty
              title="No hay versiones históricas."
              description="Crea la primera versión para definir cuánto cuesta una entrega local en esta zona."
            />
          )}
        </>
      )}
      <p className="panel-note">
        Sólo un borrador puede editarse. Al activar una versión, la anterior
        pasa a histórico y deja de aplicarse a las cotizaciones nuevas.
      </p>
      {creating && (
        <Confirm
          title="Crear nueva versión"
          label="Crear borrador"
          description={
            active
              ? `Se copiarán la vigencia y las bandas de la versión ${active.version} en una nueva versión en borrador. La versión activa no cambia.`
              : 'Se creará la primera versión en borrador, sin bandas y con una vigencia de 15 minutos.'
          }
          onClose={() => setCreating(false)}
          onConfirm={createVersion}
        />
      )}
    </section>
  )
}
function FirstBandCell({ plan }: { plan: RatePlan }) {
  const first = [...plan.bands].sort(
    (a, b) => a.minDistanceMeters - b.minDistanceMeters,
  )[0]
  return first ? (
    <span className="cell-meta">
      {money(first.amount, first.currency)}
      <small>hasta {km(first.maxDistanceMeters)}</small>
    </span>
  ) : (
    <span className="muted">Sin bandas</span>
  )
}

function RenameDialog({
  zone,
  onClose,
}: {
  zone: ServiceZone
  onClose: () => void
}) {
  const notify = useFeedback()
  return (
    <Modal title="Cambiar nombre de la zona" onClose={onClose}>
      <p className="modal-description">
        El código {zone.code} y la moneda {zone.currency} no pueden cambiarse.
      </p>
      <ActionForm
        submitLabel="Guardar nombre"
        onCancel={onClose}
        onSubmit={async (data) => {
          const name = String(data.get('name') ?? '').trim()
          if (!name || name.length > 100)
            throw new ApiError(400, 'El nombre admite de 1 a 100 caracteres.')
          const result = await serviceZones.rename(zone.id, name)
          queryClient.setQueryData(zoneKeys.detail(zone.id), result)
          await invalidate()
          notify('Nombre actualizado.')
          onClose()
        }}
      >
        <Field label="Nombre" hint="Hasta 100 caracteres.">
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={zone.name}
          />
        </Field>
      </ActionForm>
    </Modal>
  )
}

function BoundaryDialog({
  zone,
  onClose,
}: {
  zone: ServiceZone
  onClose: () => void
}) {
  const notify = useFeedback()
  return (
    <Modal title="Reemplazar cobertura" onClose={onClose}>
      <p className="modal-description">
        La geometría se sustituye por completo y el backend recalcula el
        rectángulo envolvente. Sólo es posible con la zona inactiva.
      </p>
      <ActionForm
        submitLabel="Reemplazar cobertura"
        onCancel={onClose}
        onSubmit={async (data) => {
          const boundary = parseBoundary(String(data.get('boundary') ?? ''))
          if (!boundary)
            throw new ApiError(
              400,
              'La cobertura debe ser un GeoJSON Polygon o MultiPolygon con coordenadas [longitud, latitud].',
            )
          const result = await serviceZones.replaceBoundary(zone.id, boundary)
          queryClient.setQueryData(zoneKeys.detail(zone.id), result)
          await invalidate()
          notify('Cobertura reemplazada.')
          onClose()
        }}
      >
        <Field
          label="Cobertura (GeoJSON)"
          hint="Polygon o MultiPolygon en orden [longitud, latitud], con el anillo cerrado."
        >
          <textarea
            name="boundary"
            required
            rows={12}
            spellCheck={false}
            className="geojson-input"
            defaultValue={boundaryText(zone.boundary) || SAMPLE_BOUNDARY}
          />
        </Field>
      </ActionForm>
    </Modal>
  )
}
