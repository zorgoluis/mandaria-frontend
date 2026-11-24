import { useEffect, useState } from 'react'
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
import { date } from '../utils/format'
import {
  expireWeatherPage,
  weatherBadge,
  weatherDeadline,
} from './weather-format'
import {
  weatherPilot,
  type WeatherPage,
  type WeatherZone,
} from './weather-service'
import './weather.css'

type ConfigurableZone = Pick<WeatherZone, 'serviceZone' | 'configuration'>
export function WeatherPilotPage() {
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState<ConfigurableZone | null>(null)
  const notify = useFeedback()
  return (
    <>
      <PageTitle
        title="Piloto de lluvia"
        description="Condiciones meteorológicas en un punto de cada zona."
        back="/service-zones"
      />
      <Notice>
        La lluvia vigente puede aplicar un recargo únicamente si configuraste
        una regla de lluvia automática en Recargos. Sin esa regla, esta pantalla
        sólo informa. Un dato vencido o desconocido no activa el recargo
        automático.
      </Notice>
      <WeatherList
        key={`${page}-${revision}`}
        page={page}
        onPage={setPage}
        onConfigure={(row) =>
          setSelected({
            serviceZone: row.serviceZone,
            configuration: row.configuration,
          })
        }
      />
      {selected && (
        <ConfigureWeather
          row={selected}
          onClose={() => {
            setSelected(null)
            setRevision((v) => v + 1)
          }}
          onSaved={() => {
            setSelected(null)
            setRevision((v) => v + 1)
            notify(
              'Configuración del piloto guardada. No se modificaron tarifas.',
            )
          }}
        />
      )}
    </>
  )
}

/** Component-only volatile data: no query cache, browser storage, export or history. */
function WeatherList({
  page,
  onPage,
  onConfigure,
}: {
  page: number
  onPage: (page: number) => void
  onConfigure: (row: WeatherZone) => void
}) {
  const [result, setResult] = useState<WeatherPage | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let alive = true
    let version = 0
    let controller: AbortController | undefined
    let expiry: ReturnType<typeof setTimeout> | undefined
    let retained: WeatherPage | null = null
    let receivedAt = 0
    const publish = () => {
      if (!alive || !retained) return
      clearTimeout(expiry)
      const serverNow =
        Date.parse(retained.serverTime) +
        Math.max(0, performance.now() - receivedAt)
      retained = expireWeatherPage(
        retained,
        document.visibilityState === 'hidden' ? Infinity : serverNow,
      )
      setResult(retained)
      const deadlines = retained.items.flatMap((row) =>
        row.reading ? [weatherDeadline(row.reading)] : [],
      )
      if (deadlines.length)
        expiry = setTimeout(
          publish,
          Math.max(1, Math.min(...deadlines) - serverNow),
        )
    }
    const load = async () => {
      if (document.visibilityState === 'hidden') return
      controller?.abort()
      controller = new AbortController()
      const current = ++version
      const startedAt = performance.now()
      try {
        const next = await weatherPilot.list(page, controller.signal)
        if (!alive || current !== version) return
        if (
          next.mode !== 'WEATHER_MONITORING' ||
          next.provider !== 'GOOGLE_WEATHER' ||
          !Number.isFinite(Date.parse(next.serverTime))
        )
          throw new ApiError(502, 'La respuesta del piloto no es compatible.')
        retained = next
        receivedAt = startedAt
        setError(null)
        publish()
      } catch (err) {
        if (!alive || current !== version) return
        retained = null
        clearTimeout(expiry)
        setResult(null)
        setError(err)
      }
    }
    const visibility = () => {
      if (document.visibilityState === 'hidden') {
        controller?.abort()
        version++
        publish()
      } else void load()
    }
    void load()
    const interval = setInterval(() => {
      void load()
    }, 30_000)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      alive = false
      retained = null
      controller?.abort()
      clearTimeout(expiry)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [page, retry])
  return (
    <Panel
      title="Zonas del piloto"
      description="La condición del punto consultado no confirma que llueva en toda la zona."
    >
      {error ? (
        <ErrorState error={error} retry={() => setRetry((v) => v + 1)} />
      ) : !result ? (
        <Loading />
      ) : (
        <>
          {!result.globalEnabled && (
            <div className="panel-body">
              <Notice tone="warning">
                El piloto está deshabilitado en el servidor. Puedes preparar los
                puntos de consulta; aún no se consulta Google Weather.
              </Notice>
            </div>
          )}
          <Table
            stacked
            rows={result.items.map((row) => ({
              ...row,
              id: row.serviceZone.id,
            }))}
            emptyTitle="Sin zonas de servicio"
            empty="Configura primero una zona de servicio para preparar su piloto."
            columns={[
              {
                label: 'Zona y punto',
                render: (row) => (
                  <div className="weather-cell">
                    <strong>{row.serviceZone.name}</strong>
                    <small>{row.serviceZone.code}</small>
                    {row.configuration ? (
                      <span>
                        {row.configuration.latitude.toFixed(6)},{' '}
                        {row.configuration.longitude.toFixed(6)}
                      </span>
                    ) : (
                      <span>Sin punto de consulta</span>
                    )}
                  </div>
                ),
              },
              {
                label: 'Detección',
                render: (row) => (
                  <div className="weather-cell">
                    <Badge {...weatherBadge(row)} />
                    {!row.reading && (
                      <small>
                        No hay una condición vigente para este punto.
                      </small>
                    )}
                  </div>
                ),
              },
              {
                label: 'Vigencia del dato',
                render: (row) =>
                  row.reading ? (
                    <div className="weather-cell">
                      <span>Dato: {date(row.reading.dataTime)}</span>
                      <small>Consultado: {date(row.reading.fetchedAt)}</small>
                      <small>
                        Válido hasta: {date(row.reading.validUntil)}
                      </small>
                      <div className="weather-attribution">
                        <span translate="no">Google Maps</span>
                        <small translate="no">
                          Source: Includes weather data from Google.
                        </small>
                      </div>
                    </div>
                  ) : (
                    <div className="weather-cell">
                      <span>—</span>
                      {row.lastAttemptAt && (
                        <small>Último intento: {date(row.lastAttemptAt)}</small>
                      )}
                    </div>
                  ),
              },
              {
                label: 'Configuración',
                render: (row) => (
                  <div className="weather-cell">
                    <span>
                      {row.configuration?.enabled
                        ? 'Consulta habilitada'
                        : 'Consulta desactivada'}
                    </span>
                    <button
                      className="button secondary small"
                      onClick={() => onConfigure(row)}
                    >
                      Configurar punto
                    </button>
                  </div>
                ),
              },
            ]}
          />
          <Pagination
            page={page}
            totalPages={result.totalPages}
            total={result.total}
            onPage={onPage}
          />
        </>
      )}
    </Panel>
  )
}

function ConfigureWeather({
  row,
  onClose,
  onSaved,
}: {
  row: ConfigurableZone
  onClose: () => void
  onSaved: () => void
}) {
  const [uncertain, setUncertain] = useState(false)
  return (
    <Modal title={`Piloto: ${row.serviceZone.name}`} onClose={onClose}>
      <Notice>
        Elige un punto representativo dentro de la zona. Habilitarlo permite
        consultas periódicas del piloto cuando el servidor esté habilitado; no
        activa recargos.
      </Notice>
      <ActionForm
        submitLabel="Guardar punto"
        onCancel={onClose}
        submitDisabled={uncertain}
        onSubmit={async (data) => {
          const coordinate = (key: string, max: number) => {
            const value = String(data.get(key) ?? '').trim()
            if (
              !/^-?\d+(\.\d{1,6})?$/.test(value) ||
              Math.abs(Number(value)) > max
            )
              throw new ApiError(
                400,
                'Las coordenadas deben ser válidas y tener hasta seis decimales.',
              )
            return Number(value)
          }
          const reason = String(data.get('reason') ?? '').trim()
          if (!reason || reason.length > 500)
            throw new ApiError(
              400,
              'Escribe un motivo de hasta 500 caracteres.',
            )
          const input = {
            enabled: data.get('enabled') === 'on',
            latitude: coordinate('latitude', 90),
            longitude: coordinate('longitude', 180),
            reason,
          }
          try {
            await weatherPilot.configure(row.serviceZone.id, input)
          } catch (err) {
            if (
              !(err instanceof ApiError) ||
              err.status === 0 ||
              err.status >= 500
            ) {
              setUncertain(true)
              throw new ApiError(
                0,
                'No se confirmó el resultado. Cierra el diálogo y consulta la configuración antes de volver a guardar.',
              )
            }
            throw err
          }
          onSaved()
        }}
      >
        <div className="weather-coordinates">
          <Field label="Latitud">
            <input
              name="latitude"
              type="number"
              min="-90"
              max="90"
              step="0.000001"
              required
              defaultValue={row.configuration?.latitude ?? ''}
            />
          </Field>
          <Field label="Longitud">
            <input
              name="longitude"
              type="number"
              min="-180"
              max="180"
              step="0.000001"
              required
              defaultValue={row.configuration?.longitude ?? ''}
            />
          </Field>
        </div>
        <label className="weather-toggle">
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={row.configuration?.enabled ?? false}
          />
          <span>Habilitar consulta del punto</span>
        </label>
        <Field label="Motivo del cambio">
          <textarea name="reason" required maxLength={500} rows={3} />
        </Field>
        {row.serviceZone.status !== 'ACTIVE' && (
          <Notice tone="warning">
            La zona está inactiva. No se consultará su clima hasta que esté
            activa.
          </Notice>
        )}
      </ActionForm>
    </Modal>
  )
}
