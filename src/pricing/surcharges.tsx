import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ActionForm,
  Badge,
  ErrorState,
  Field,
  Loading,
  Modal,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { Notice, Panel } from '../components/design'
import { useFeedback } from '../components/feedback-context'
import { ApiError } from '../services/errors'
import { queryClient } from '../services/query'
import { date } from '../utils/format'
import { serviceZones } from './service'
import type { ServiceZoneSummary } from './types'
import {
  pricingSurcharges,
  type Surcharge,
  type SurchargeInput,
  type SurchargeKind,
} from './surcharges-service'
import { surchargeStatus } from './surcharges-format'
import './surcharges.css'

const days = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]
const labels = { SCHEDULE: 'Horario', MANUAL_RAIN: 'Lluvia manual' }
const key = ['pricing-surcharges'] as const
const clock = (minute: number | null) =>
  minute === null
    ? '—'
    : `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
async function loadZones(signal: AbortSignal) {
  const items: ServiceZoneSummary[] = []
  let page = 1
  for (;;) {
    const result = await serviceZones.list({ page, pageSize: 100 }, signal)
    items.push(...result.items)
    if (page >= result.totalPages) return items
    page++
  }
}
export function PricingSurchargesPage() {
  const [zoneId, setZoneId] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [deactivating, setDeactivating] = useState<Surcharge | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const notify = useFeedback()
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [])
  const zones = useQuery({
    queryKey: ['service-zones', 'surcharge-options'],
    queryFn: ({ signal }) => loadZones(signal),
  })
  const filters = {
    page,
    pageSize: 20,
    ...(zoneId ? { serviceZoneId: zoneId } : {}),
  }
  const query = useQuery({
    queryKey: [...key, filters],
    queryFn: ({ signal }) => pricingSurcharges.list(filters, signal),
    staleTime: 0,
    refetchInterval: 30_000,
  })
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: key })
  }
  const zoneName = (id: string) =>
    zones.data?.find((zone) => zone.id === id)?.name ?? id
  return (
    <>
      <PageTitle
        title="Recargos"
        description="Ajustes por horario y lluvia manual para nuevas cotizaciones."
        back="/service-zones"
        action={
          <button
            className="button"
            disabled={!zones.data?.length || query.isError}
            onClick={() => setCreating(true)}
          >
            Nuevo recargo
          </button>
        }
      />
      <Notice>
        Se suma el mayor recargo de horario aplicable y el mayor de lluvia
        vigente. Las cotizaciones ya emitidas conservan su precio.
      </Notice>
      <Panel title="Recargos configurados">
        <div className="panel-body">
          <Field label="Filtrar por zona">
            <select
              value={zoneId}
              onChange={(event) => {
                setZoneId(event.target.value)
                setPage(1)
              }}
            >
              <option value="">Todas las zonas</option>
              {zones.data?.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {zones.isError && (
          <ErrorState
            error={zones.error}
            retry={() => {
              void zones.refetch()
            }}
          />
        )}
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
              emptyTitle="Sin recargos"
              empty="Crea un recargo por horario o activa lluvia manual con vencimiento."
              columns={[
                {
                  label: 'Zona y concepto',
                  render: (row) => (
                    <div className="surcharge-cell">
                      <strong>{zoneName(row.serviceZoneId)}</strong>
                      <span>{labels[row.kind]} · Entrega local</span>
                      <small>{row.reason}</small>
                    </div>
                  ),
                },
                {
                  label: 'Importe',
                  render: (row) => (
                    <span>
                      +{row.amount} {row.currency}
                    </span>
                  ),
                },
                {
                  label: 'Aplicación',
                  render: (row) =>
                    row.kind === 'SCHEDULE' ? (
                      <div className="surcharge-cell">
                        <span>
                          {row.weekdays.map((day) => days[day]).join(', ')}
                        </span>
                        <span>
                          {clock(row.startMinute)}–{clock(row.endMinute)}
                          {(row.endMinute ?? 0) < (row.startMinute ?? 0)
                            ? ' (día siguiente)'
                            : ''}
                        </span>
                        <small>{row.timeZone}</small>
                      </div>
                    ) : (
                      <div className="surcharge-cell">
                        <span>Hasta {date(row.expiresAt!)}</span>
                        <small>Hora de este dispositivo</small>
                      </div>
                    ),
                },
                {
                  label: 'Estado',
                  render: (row) => <Badge {...surchargeStatus(row, now)} />,
                },
                {
                  label: 'Acciones',
                  render: (row) =>
                    surchargeStatus(row, now).value === 'ACTIVE' ? (
                      <button
                        className="button secondary small"
                        onClick={() => setDeactivating(row)}
                      >
                        Desactivar
                      </button>
                    ) : (
                      <span>{row.disableReason || '—'}</span>
                    ),
                },
              ]}
            />
            <Pagination
              page={page}
              totalPages={query.data.totalPages}
              total={query.data.total}
              onPage={setPage}
            />
          </>
        )}
      </Panel>
      {creating && zones.data && (
        <CreateSurcharge
          zones={zones.data}
          initialZoneId={zoneId}
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false)
            await refresh()
            notify('Recargo creado para nuevas cotizaciones.')
          }}
        />
      )}
      {deactivating && (
        <DeactivateSurcharge
          row={deactivating}
          onClose={() => setDeactivating(null)}
          onSaved={async () => {
            setDeactivating(null)
            await refresh()
            notify('Recargo desactivado. Las cotizaciones emitidas no cambian.')
          }}
        />
      )}
    </>
  )
}
function CreateSurcharge({
  zones,
  initialZoneId,
  onClose,
  onSaved,
}: {
  zones: ServiceZoneSummary[]
  initialZoneId: string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [kind, setKind] = useState<SurchargeKind>('SCHEDULE')
  const [zoneId, setZoneId] = useState(initialZoneId || zones[0]?.id || '')
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const currency = zones.find((zone) => zone.id === zoneId)?.currency ?? ''
  return (
    <Modal
      title="Nuevo recargo"
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <ActionForm
        submitLabel="Crear recargo"
        submitDisabled={uncertain}
        onCancel={onClose}
        onSubmit={async (data) => {
          const amount = String(data.get('amount') || '')
          const reason = String(data.get('reason') || '').trim()
          if (
            !/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(amount) ||
            Number(amount) <= 0
          )
            throw new ApiError(
              400,
              'Escribe un importe mayor que cero con hasta dos decimales.',
            )
          if (!reason) throw new ApiError(400, 'Escribe el motivo del recargo.')
          const input: SurchargeInput = {
            serviceZoneId: zoneId,
            serviceType: 'LOCAL_DELIVERY',
            kind,
            amount: Number(amount).toFixed(2),
            reason,
          }
          if (kind === 'SCHEDULE') {
            input.weekdays = data.getAll('weekdays').map(Number)
            if (!input.weekdays.length)
              throw new ApiError(400, 'Selecciona al menos un día.')
            const minutes = (name: string) => {
              const [hour, minute] = String(data.get(name))
                .split(':')
                .map(Number)
              return hour * 60 + minute
            }
            input.startMinute = minutes('start')
            input.endMinute = minutes('end')
            if (input.startMinute === input.endMinute)
              throw new ApiError(
                400,
                'Las horas inicial y final deben ser distintas.',
              )
            input.timeZone = String(data.get('timeZone') || '').trim()
            try {
              new Intl.DateTimeFormat('es-MX', {
                timeZone: input.timeZone,
              }).format()
            } catch {
              throw new ApiError(
                400,
                'Escribe una zona horaria válida, como America/Mexico_City.',
              )
            }
          } else {
            const end = new Date(String(data.get('expiresAt')))
            if (!Number.isFinite(end.getTime()) || end.getTime() <= Date.now())
              throw new ApiError(
                400,
                'El vencimiento debe ser una fecha y hora futuras.',
              )
            input.expiresAt = end.toISOString()
          }
          setBusy(true)
          try {
            await pricingSurcharges.create(input)
            await onSaved()
          } catch (error) {
            if (
              !(error instanceof ApiError) ||
              error.status === 0 ||
              error.status >= 500
            ) {
              setUncertain(true)
              void queryClient.invalidateQueries({ queryKey: key })
              throw new ApiError(
                0,
                'No se confirmó el resultado. Cierra y consulta el listado antes de crear otro recargo.',
              )
            }
            throw error
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field label="Zona">
          <select
            name="serviceZoneId"
            required
            value={zoneId}
            onChange={(event) => setZoneId(event.target.value)}
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} · {zone.currency}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Servicio">
          <select name="serviceType">
            <option value="LOCAL_DELIVERY">Entrega local</option>
          </select>
        </Field>
        <Field label="Tipo de recargo">
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as SurchargeKind)}
          >
            <option value="SCHEDULE">Horario</option>
            <option value="MANUAL_RAIN">Lluvia manual</option>
          </select>
        </Field>
        <Field label={`Importe adicional (${currency})`}>
          <input
            name="amount"
            inputMode="decimal"
            defaultValue="5.00"
            required
          />
        </Field>
        {kind === 'SCHEDULE' ? (
          <>
            <Field label="Zona horaria">
              <input
                name="timeZone"
                defaultValue="America/Mexico_City"
                required
              />
            </Field>
            <fieldset className="surcharge-days">
              <legend>Días de inicio</legend>
              {days.map((day, index) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={index}
                    defaultChecked
                  />
                  {day}
                </label>
              ))}
            </fieldset>
            <div className="surcharge-times">
              <Field label="Desde">
                <input type="time" name="start" defaultValue="22:00" required />
              </Field>
              <Field label="Hasta">
                <input type="time" name="end" defaultValue="06:00" required />
              </Field>
            </div>
            <p className="panel-note">
              Si termina antes de la hora inicial, continúa al día siguiente.
              Los días elegidos corresponden al inicio.
            </p>
          </>
        ) : (
          <>
            <Field
              label="Vence el"
              hint={`Hora de este dispositivo: ${Intl.DateTimeFormat().resolvedOptions().timeZone}. El recargo deja de aplicarse al llegar este momento.`}
            >
              <input name="expiresAt" type="datetime-local" required />
            </Field>
          </>
        )}
        <Field label="Motivo">
          <textarea name="reason" maxLength={500} required />
        </Field>
      </ActionForm>
    </Modal>
  )
}
function DeactivateSurcharge({
  row,
  onClose,
  onSaved,
}: {
  row: Surcharge
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      title="Desactivar recargo"
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <p className="modal-description">
        {labels[row.kind]} · +{row.amount} {row.currency}. Las cotizaciones
        emitidas conservarán su precio.
      </p>
      <ActionForm
        submitLabel="Confirmar desactivación"
        onCancel={onClose}
        onSubmit={async (data) => {
          const reason = String(data.get('reason') || '').trim()
          if (!reason)
            throw new ApiError(400, 'Escribe el motivo de desactivación.')
          setBusy(true)
          try {
            await pricingSurcharges.deactivate(row.id, reason)
            await onSaved()
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field label="Motivo de desactivación">
          <textarea name="reason" maxLength={500} required />
        </Field>
      </ActionForm>
    </Modal>
  )
}
