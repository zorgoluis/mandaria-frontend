import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ActionForm,
  Badge,
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  Table,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { ApiError } from '../services/errors'
import { queryClient } from '../services/query'
import { serviceZones } from '../pricing/service'
import { serviceTypes, type ServiceType } from '../pricing/types'
import { zoneStatusLabels } from '../pricing/format'
import { myServiceCoverages, serviceCoverages } from './service'
import { coverageKeys, refreshCoverages } from './queries'
import {
  FROZEN_ON_ACTIVATE,
  FROZEN_ON_DEACTIVATE,
  coverageStatusLabels,
  findCoverage,
  serviceTypeLabel,
  sortCoverages,
} from './format'
import type { ServiceCoverage } from './types'

const FROZEN_NOTE =
  'La cobertura sólo afecta a los servicios que se abran a partir de ahora: los candidatos de los servicios ya abiertos no se recalculan.'

function ZoneCell({ coverage }: { coverage: ServiceCoverage }) {
  return (
    <span className="entity-name">
      {coverage.serviceZone.name}
      <small>{coverage.serviceZone.code}</small>
      {coverage.serviceZone.status !== 'ACTIVE' && (
        <small>Zona inactiva: no recibe servicios nuevos.</small>
      )}
    </span>
  )
}
const status = (coverage: ServiceCoverage) => (
  <Badge
    value={coverage.status}
    label={coverageStatusLabels[coverage.status]}
  />
)

/** SUPER_ADMIN: where and for which services this provider may receive fleet dispatches. */
export function ProviderCoveragePanel({ providerId }: { providerId: string }) {
  const query = useQuery({
    queryKey: coverageKeys.admin(providerId),
    queryFn: ({ signal }) => serviceCoverages.list(providerId, signal),
    staleTime: 0,
  })
  const [adding, setAdding] = useState(false)
  const [changing, setChanging] = useState<ServiceCoverage | null>(null)
  const add = (
    <button className="button" onClick={() => setAdding(true)}>
      Agregar cobertura
    </button>
  )
  return (
    <section className="panel" aria-labelledby="provider-coverage">
      <div className="panel-toolbar">
        <div>
          <h2 id="provider-coverage">Cobertura de servicio</h2>
          <p>
            Zonas y tipos de servicio en los que recibe servicios de flotilla
          </p>
        </div>
        {query.isSuccess && query.data.length > 0 && add}
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
      ) : query.data.length === 0 ? (
        <Empty
          title="Este proveedor todavía no tiene cobertura de servicio configurada."
          description="Sin cobertura activa no recibirá nuevos servicios de flotilla para esas zonas."
          action={add}
        />
      ) : (
        <Table
          stacked
          rows={sortCoverages(query.data)}
          columns={[
            { label: 'Zona', render: (row) => <ZoneCell coverage={row} /> },
            {
              label: 'Tipo de servicio',
              render: (row) => serviceTypeLabel(row.serviceType),
            },
            { label: 'Estado', render: status },
            {
              label: 'Acciones',
              render: (row) => (
                <button
                  className={`button secondary small coverage-action${row.status === 'ACTIVE' ? ' destructive' : ''}`}
                  onClick={() => setChanging(row)}
                  aria-label={`${row.status === 'ACTIVE' ? 'Desactivar' : 'Activar'} cobertura de ${row.serviceZone.name}, ${serviceTypeLabel(row.serviceType)}`}
                >
                  {row.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                </button>
              ),
            },
          ]}
        />
      )}
      <p className="panel-note">
        Mandaria administra la cobertura; el proveedor sólo la consulta.{' '}
        {FROZEN_NOTE}
      </p>
      {adding && (
        <AddCoverageDialog
          providerId={providerId}
          onClose={() => setAdding(false)}
        />
      )}
      {changing && (
        <CoverageStatusDialog
          providerId={providerId}
          coverage={changing}
          onClose={() => setChanging(null)}
        />
      )}
    </section>
  )
}

/**
 * POST with the flat {serviceZoneId, serviceType}. A 409 SERVICE_COVERAGE_EXISTS means the row is
 * already there: it is looked up in the fresh list and, if INACTIVE, offered for reactivation
 * with PATCH instead of creating a duplicate.
 */
function AddCoverageDialog({
  providerId,
  onClose,
}: {
  providerId: string
  onClose: () => void
}) {
  const notify = useFeedback()
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  // One request per pause, not per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])
  const [zoneId, setZoneId] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType>(serviceTypes[0])
  const [existing, setExisting] = useState<ServiceCoverage | null>(null)
  const zones = useQuery({
    queryKey: ['service-zones', 'coverage-options', term],
    queryFn: ({ signal }) =>
      serviceZones.list({ page: 1, pageSize: 100, search: term }, signal),
  })

  if (existing)
    return (
      <Modal title="Agregar cobertura" onClose={onClose}>
        {existing.status === 'INACTIVE' ? (
          <>
            <p className="modal-description">
              Esta cobertura ya existe, pero está desactivada. ¿Deseas
              reactivarla?
            </p>
            <p className="panel-note">
              {existing.serviceZone.name} ·{' '}
              {serviceTypeLabel(existing.serviceType)}. {FROZEN_ON_ACTIVATE}
            </p>
            <ActionForm
              initialDirty
              submitLabel="Reactivar"
              cancelLabel="Cancelar"
              onCancel={onClose}
              onSubmit={async () => {
                await serviceCoverages.setStatus(
                  providerId,
                  existing.id,
                  'ACTIVE',
                )
                await refreshCoverages(providerId)
                notify('Cobertura reactivada.')
                onClose()
              }}
            >
              {null}
            </ActionForm>
          </>
        ) : (
          <>
            <p className="modal-description">
              Esta cobertura ya existe y está activa: el proveedor ya recibe
              esos servicios.
            </p>
            <div className="form-actions">
              <button className="button" onClick={onClose}>
                Entendido
              </button>
            </div>
          </>
        )}
      </Modal>
    )

  return (
    <Modal title="Agregar cobertura" onClose={onClose}>
      <p className="modal-description">{FROZEN_ON_ACTIVATE}</p>
      <ActionForm
        initialDirty
        submitLabel="Agregar cobertura"
        cancelLabel="Cancelar"
        onCancel={onClose}
        onSubmit={async () => {
          if (!zoneId) throw new ApiError(400, 'Elige la zona de servicio.')
          try {
            await serviceCoverages.create(providerId, {
              serviceZoneId: zoneId,
              serviceType,
            })
          } catch (error) {
            if (
              error instanceof ApiError &&
              error.code === 'SERVICE_COVERAGE_EXISTS'
            ) {
              await refreshCoverages(providerId)
              const list =
                queryClient.getQueryData<ServiceCoverage[]>(
                  coverageKeys.admin(providerId),
                ) ?? []
              const row = findCoverage(list, zoneId, serviceType)
              if (row) {
                setExisting(row)
                return
              }
            }
            throw error
          }
          await refreshCoverages(providerId)
          notify('Cobertura agregada.')
          onClose()
        }}
      >
        <Field
          label="Buscar zona"
          hint="Por nombre o código de las zonas de servicio existentes."
        >
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        {zones.isPending ? (
          <Loading />
        ) : zones.isError ? (
          <ErrorState
            error={zones.error}
            retry={() => {
              void zones.refetch()
            }}
          />
        ) : zones.data.items.length ? (
          <Field
            label="Zona de servicio"
            hint="Una zona inactiva no recibe servicios nuevos hasta que se active."
          >
            <select
              value={zoneId}
              onChange={(event) => setZoneId(event.target.value)}
            >
              <option value="">Selecciona una zona</option>
              {zones.data.items.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                  {zone.status !== 'ACTIVE'
                    ? ` (${zoneStatusLabels[zone.status].toLowerCase()})`
                    : ''}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Empty
            title="No hay zonas de servicio"
            description="Crea primero la zona en Zonas de servicio."
          />
        )}
        <Field label="Tipo de servicio">
          <select
            value={serviceType}
            onChange={(event) =>
              setServiceType(event.target.value as ServiceType)
            }
          >
            {serviceTypes.map((type) => (
              <option key={type} value={type}>
                {serviceTypeLabel(type)}
              </option>
            ))}
          </select>
        </Field>
      </ActionForm>
    </Modal>
  )
}

/** ACTIVE ↔ INACTIVE with PATCH. There is no delete; the warning tells what does not change. */
function CoverageStatusDialog({
  providerId,
  coverage,
  onClose,
}: {
  providerId: string
  coverage: ServiceCoverage
  onClose: () => void
}) {
  const notify = useFeedback()
  const deactivate = coverage.status === 'ACTIVE'
  return (
    <Modal
      title={deactivate ? 'Desactivar cobertura' : 'Activar cobertura'}
      onClose={onClose}
    >
      <p className="modal-description">
        {coverage.serviceZone.name} · {serviceTypeLabel(coverage.serviceType)}
      </p>
      <p className="warning notice" role="note">
        {deactivate ? FROZEN_ON_DEACTIVATE : FROZEN_ON_ACTIVATE}
      </p>
      <ActionForm
        initialDirty
        submitLabel={deactivate ? 'Desactivar' : 'Activar'}
        cancelLabel="Cancelar"
        onCancel={onClose}
        onSubmit={async () => {
          await serviceCoverages.setStatus(
            providerId,
            coverage.id,
            deactivate ? 'INACTIVE' : 'ACTIVE',
          )
          await refreshCoverages(providerId)
          notify(deactivate ? 'Cobertura desactivada.' : 'Cobertura activada.')
          onClose()
        }}
      >
        {null}
      </ActionForm>
    </Modal>
  )
}

/** PROVIDER_ADMIN: read only. No add, activate, deactivate or remove controls exist here. */
export function MyCoverage({ providerId }: { providerId: string }) {
  const query = useQuery({
    queryKey: coverageKeys.mine(providerId),
    queryFn: ({ signal }) => myServiceCoverages.list(providerId, signal),
  })
  return (
    <section className="panel" aria-labelledby="my-coverage">
      <div className="panel-toolbar">
        <div>
          <h2 id="my-coverage">Mi cobertura</h2>
          <p>Zonas y tipos de servicio en los que recibes servicios</p>
        </div>
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
      ) : query.data.length === 0 ? (
        <Empty
          title="Tu proveedor no tiene cobertura de servicio configurada."
          description="Contacta al administrador de Mandaria para habilitar zonas de operación."
        />
      ) : (
        <Table
          stacked
          rows={sortCoverages(query.data)}
          columns={[
            { label: 'Zona', render: (row) => <ZoneCell coverage={row} /> },
            {
              label: 'Tipo de servicio',
              render: (row) => serviceTypeLabel(row.serviceType),
            },
            { label: 'Estado', render: status },
          ]}
        />
      )}
      <p className="panel-note">
        Mandaria administra tu cobertura. Sólo recibes servicios de las zonas
        con cobertura activa; {FROZEN_NOTE.charAt(0).toLowerCase()}
        {FROZEN_NOTE.slice(1)}
      </p>
    </section>
  )
}
