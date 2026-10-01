import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/context'
import {
  ErrorPage,
  ErrorState,
  Field,
  InfoGrid,
  Loading,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { date } from '../utils/format'
import { webhookQueries } from './queries'
import { WebhookSettings } from './settings'
import { failureLabels, reasonLabels, transportLabels } from './format'
import type { EventFilters } from './types'

export function WebhookPanel({ id }: { id: string }) {
  const auth = useAuth()
  return auth.user?.role === 'SUPER_ADMIN' && !auth.loading ? (
    <WebhookContent key={id} id={id} />
  ) : null
}
function WebhookContent({ id }: { id: string }) {
  const summary = useQuery(webhookQueries.summary(id))
  return (
    <section className="panel" aria-label="Webhook de integración">
      <div className="panel-toolbar">
        <h2>Webhook</h2>
        <div className="row-actions">
          <Link to="/developers/webhooks">Guía del receptor</Link>
          <Link to="/webhooks/health">Salud de webhooks</Link>
        </div>
      </div>
      <WebhookSettings id={id} />
      <div className="panel-toolbar">
        <h3>Resumen de esta integración</h3>
      </div>
      {summary.isPending ? (
        <Loading />
      ) : summary.isError ? (
        <ErrorState
          error={summary.error}
          retry={() => void summary.refetch()}
        />
      ) : (
        <InfoGrid
          items={[
            ['Eventos registrados', String(summary.data.events)],
            ['Pendientes', String(summary.data.pending)],
            ['Aceptados por receptor', String(summary.data.delivered)],
            ['Intentos agotados', String(summary.data.exhausted)],
          ]}
        />
      )}
      <p className="panel-note">
        El total puede incluir eventos sin transporte programado. DELIVERED /
        HTTP 2xx significa aceptación por el receptor, no procesamiento
        comercial ni cobro.
      </p>
      <WebhookEvents id={id} />
    </section>
  )
}
export function WebhookEvents({ id }: { id: string }) {
  const [filters, setFilters] = useState<EventFilters>({ page: 1 })
  const [error, setError] = useState('')
  const query = useQuery(webhookQueries.events(id, filters))
  return (
    <>
      <div className="panel-toolbar">
        <h3>Eventos e intentos</h3>
        <button
          className="button secondary"
          onClick={() => void query.refetch()}
        >
          Actualizar eventos
        </button>
      </div>
      <form
        className="panel-body webhook-filters"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          const from = String(data.get('from') ?? '')
          const to = String(data.get('to') ?? '')
          if (from && to && from > to) {
            setError('La fecha inicial debe ser anterior a la final.')
            return
          }
          setError('')
          setFilters({
            page: 1,
            transportState: String(data.get('state') ?? ''),
            deliveryRequestPublicId: String(data.get('request') ?? '').trim(),
            externalReference: String(data.get('reference') ?? '').trim(),
            occurredFrom: from ? new Date(from).toISOString() : undefined,
            occurredTo: to ? new Date(to).toISOString() : undefined,
          })
        }}
      >
        <Field label="Estado de transporte">
          <select name="state">
            <option value="">Todos</option>
            {Object.entries(transportLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Solicitud">
          <input name="request" maxLength={32} placeholder="MDR-000123" />
        </Field>
        <Field label="Referencia externa exacta">
          <input name="reference" maxLength={255} />
        </Field>
        <Field label="Desde (hora local)">
          <input type="datetime-local" name="from" />
        </Field>
        <Field label="Hasta (hora local)">
          <input type="datetime-local" name="to" />
        </Field>
        <button className="button" type="submit">
          Aplicar filtros
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : query.data.items.some((e) => e.integrationClientId !== id) ? (
        <ErrorPage code={403} />
      ) : (
        <>
          <Table
            stacked
            rows={query.data.items.map((e) => ({ ...e, id: e.eventId }))}
            columns={[
              {
                label: 'Solicitud',
                render: (e) => (
                  <Link
                    to={`/integrations/${encodeURIComponent(id)}/webhooks/${encodeURIComponent(e.eventId)}`}
                  >
                    {e.deliveryRequestPublicId}
                  </Link>
                ),
              },
              {
                label: 'Referencia',
                render: (e) => e.externalReference ?? '—',
              },
              {
                label: 'Transporte',
                render: (e) => (
                  <>
                    {transportLabels[e.transportState] ?? 'Desconocido'}
                    {e.inFlight && ' · En vuelo'}
                    {e.noDeliveryReason && (
                      <small>
                        {reasonLabels[e.noDeliveryReason] ??
                          'Motivo no reconocido'}
                      </small>
                    )}
                  </>
                ),
              },
              { label: 'Intentos', render: (e) => e.attemptCount },
              {
                label: 'Próximo intento',
                render: (e) => date(e.nextAttemptAt),
              },
              { label: 'Evento', render: (e) => date(e.occurredAt) },
            ]}
          />
          <Pagination
            page={filters.page}
            total={query.data.total}
            totalPages={query.data.totalPages}
            onPage={(page) => setFilters({ ...filters, page })}
          />
        </>
      )}
    </>
  )
}
export function WebhookEventPage() {
  const { id = '', eventId = '' } = useParams()
  const query = useQuery(webhookQueries.event(id, eventId))
  if (query.isPending) return <Loading />
  if (query.isError)
    return <ErrorState error={query.error} retry={() => void query.refetch()} />
  if (query.data.integrationClientId !== id) return <ErrorPage code={403} />
  const event = query.data
  return (
    <>
      <PageTitle
        title={event.deliveryRequestPublicId}
        description="Evento y transporte de webhook"
        back={`/integrations/${encodeURIComponent(id)}`}
      />
      <section className="panel">
        <InfoGrid
          items={[
            ['Evento', event.type],
            ['Registrado', date(event.occurredAt)],
            [
              'Transporte',
              transportLabels[event.transportState] ?? 'Desconocido',
            ],
            ['Destino actual', event.endpoint?.url ?? 'Sin destino'],
            [
              'Envíos',
              event.endpoint?.enabled ? 'Habilitados' : 'Deshabilitados',
            ],
          ]}
        />
        <p className="panel-note">
          HTTP 2xx / DELIVERED acredita aceptación por el receptor, no
          procesamiento comercial ni cobro.
        </p>
        <div className="panel-toolbar">
          <h2>Historial de intentos</h2>
        </div>
        <Table
          stacked
          rows={event.attempts}
          columns={[
            {
              label: 'Intento',
              render: (a) => a.attemptNumber ?? 'Histórico sin número',
            },
            { label: 'Fecha', render: (a) => date(a.attemptedAt) },
            {
              label: 'Resultado',
              render: (a) =>
                a.result === 'SUCCEEDED' ? 'Aceptado por receptor' : 'Fallido',
            },
            { label: 'HTTP', render: (a) => a.httpStatus ?? 'Sin respuesta' },
            {
              label: 'Causa',
              render: (a) =>
                a.failureKind
                  ? (failureLabels[a.failureKind] ?? 'Causa no reconocida')
                  : '—',
            },
            { label: 'Duración', render: (a) => `${a.durationMs} ms` },
            { label: 'Destino histórico', render: (a) => a.endpointUrl },
          ]}
        />
        <details className="panel-body">
          <summary>Instantánea pública del evento</summary>
          <pre className="developer-code">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </details>
      </section>
    </>
  )
}
export function WebhookHealthPage() {
  const query = useQuery(webhookQueries.health())
  if (query.isPending) return <Loading />
  if (query.isError)
    return <ErrorState error={query.error} retry={() => void query.refetch()} />
  const h = query.data
  return (
    <>
      <PageTitle
        title="Salud de webhooks"
        back="/integrations"
        action={
          <button
            className="button secondary"
            onClick={() => void query.refetch()}
          >
            Actualizar salud
          </button>
        }
      />
      <section className="panel">
        <div className="panel-toolbar">
          <h2>Métricas compartidas</h2>
        </div>
        <InfoGrid
          items={[
            ['Pendientes', String(h.pending)],
            ['Intentos agotados', String(h.exhausted)],
            ['Aceptados', String(h.delivered)],
            ['En vuelo', String(h.leased)],
            ['Pendiente más antiguo', date(h.oldestPendingDueAt)],
          ]}
        />
      </section>
      <section className="panel">
        <div className="panel-toolbar">
          <h2>Instancia que responde (thisInstance)</h2>
        </div>
        <InfoGrid
          items={[
            [
              'Worker',
              h.thisInstance.workerEnabled ? 'Habilitado' : 'Deshabilitado',
            ],
            ['Última consulta', date(h.thisInstance.lastPollAt)],
            ['Intervalo', `${h.thisInstance.pollSeconds} s`],
            ['Lease', `${h.thisInstance.leaseSeconds} s`],
          ]}
        />
        <p className="panel-note">
          Esta lectura no acredita la salud de todas las réplicas ni que el
          receptor haya procesado los eventos.
        </p>
      </section>
    </>
  )
}
