import { useEffect, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bike,
  Camera,
  Check,
  CheckCircle2,
  FileText,
  IdCard,
  Mail,
  PencilLine,
  Save,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../auth/context'
import { Field, Loading } from '../components/ui'
import { Form } from './common'
import { TermsPanel } from './terms'
import { useCommand } from './hooks'
import { verification, putEvidence, validateFile } from './service'
import { labels, message, vkey } from './format'
import { labels as vehicleLabels } from '../utils/format'
import { unitRequirements } from './unit-requirements'
import {
  motorTypes,
  type Onboarding,
  type Requirements,
  type VerificationCase,
} from './types'
import './registration-journey.css'

function latest(data: Onboarding, vehicleId?: string) {
  return data.subjects
    .filter((s) =>
      vehicleId
        ? s.vehicleId === vehicleId
        : s.driverId === data.driver.id && !s.vehicleId,
    )
    .flatMap((s) => s.cases)
    .find((c) => c.environment === data.environment)
}
function completeData(identity?: VerificationCase, unit?: VerificationCase) {
  return !!(
    identity?.data.fullName &&
    identity.data.contactPhone &&
    unit?.data.declaredOwnerName &&
    unit.data.serialNumber &&
    unit.data.ownershipEvidenceType
  )
}
export function RegistrationJourney({
  data,
  requirements,
  accepted,
  blocked,
}: {
  data: Onboarding
  requirements: Requirements
  accepted: boolean
  blocked: boolean
}) {
  const { user } = useAuth()
  const vehicle = data.driver.independentProfile?.vehicles[0]
  const identitySummary = latest(data)
  const unitSummary = vehicle && latest(data, vehicle.id)
  const records = useQuery({
    queryKey: vkey(
      user!.id,
      'journey',
      identitySummary?.id,
      identitySummary?.revision,
      unitSummary?.id,
      unitSummary?.revision,
    ),
    queryFn: async ({ signal }) => ({
      identity: identitySummary
        ? await verification.get(identitySummary.id, signal)
        : undefined,
      unit: unitSummary
        ? await verification.get(unitSummary.id, signal)
        : undefined,
    }),
    retry: false,
    placeholderData: keepPreviousData,
  })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const ready = completeData(records.data?.identity, records.data?.unit)
  const submitted =
    identitySummary?.status === 'SUBMITTED' &&
    unitSummary?.status === 'SUBMITTED'
  const otherStatus =
    [identitySummary, unitSummary].some(
      (c) => c && !['DRAFT', 'SUBMITTED'].includes(c.status),
    ) ||
    (!!identitySummary &&
      !!unitSummary &&
      identitySummary.status !== unitSummary.status)
  const stage = !accepted
    ? 0
    : submitted
      ? 3
      : !ready || editing || saving
        ? 1
        : 2
  return (
    <div className="driver-documentary registration-journey">
      <header className="documentary-heading journey-heading">
        <div>
          <p className="journey-eyebrow">TU CAMINO CON MANDARIA</p>
          <h1>
            {submitted
              ? 'Recibimos tu solicitud'
              : stage === 2
                ? 'Ya casi terminas'
                : stage === 1
                  ? 'Vamos con tus datos'
                  : 'Tu cuenta está lista'}
          </h1>
          <p>
            {submitted
              ? 'Revisaremos tus datos y documentos. Te avisaremos por correo cuando haya una respuesta.'
              : stage === 2
                ? 'Agrega tus fotos y envía todo en una sola solicitud.'
                : 'Completa tu registro a tu ritmo. Puedes volver y continuar con lo que hayas guardado.'}
          </p>
        </div>
        <span className="journey-account-badge">
          <CheckCircle2 size={16} aria-hidden="true" /> Correo confirmado
        </span>
      </header>
      <ol className="journey-steps" aria-label="Avance del registro">
        {['Términos', 'Datos y vehículo', 'Fotos y envío'].map((label, i) => (
          <li
            key={label}
            className={stage > i ? 'is-complete' : undefined}
            aria-current={stage === i ? 'step' : undefined}
          >
            <span className="journey-step-number" aria-hidden="true">
              {stage > i ? <Check size={17} /> : `0${i + 1}`}
            </span>
            <div>
              <small>PASO {i + 1}</small>
              <strong>{label}</strong>
            </div>
          </li>
        ))}
      </ol>
      <div className="journey-layout">
        <div className="journey-main">
          {requirements.environment === 'LOCAL_TEST' && (
            <p className="notice">
              Modo de prueba: utiliza únicamente datos e imágenes sintéticos.
            </p>
          )}
          {submitted ? (
            <section className="panel journey-success">
              <span className="journey-success-icon">
                <Check size={36} aria-hidden="true" />
              </span>
              <span className="journey-success-label">SOLICITUD ENVIADA</span>
              <h2>Tu solicitud está en revisión</h2>
              <p>
                La revisión de tus documentos es necesaria antes de empezar a
                repartir.
              </p>
              <div className="journey-review-items">
                <span>
                  <CheckCircle2 size={18} aria-hidden="true" /> Datos y vehículo
                  recibidos
                </span>
                <span>
                  <CheckCircle2 size={18} aria-hidden="true" /> Fotos y
                  documentos recibidos
                </span>
                <span>
                  <Mail size={18} aria-hidden="true" /> Próxima respuesta por
                  correo
                </span>
              </div>
              <Link className="button" to="/profile">
                Ir a mi cuenta <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </section>
          ) : otherStatus ? (
            <section className="panel">
              <h2>Consulta el avance de tus documentos</h2>
              <p>Hay documentos con una respuesta o una revisión en curso.</p>
              <Link to="/driver/onboarding?view=details">
                Ver resultado y correcciones
              </Link>
            </section>
          ) : !accepted ? (
            <>
              <p className="journey-terms-intro">
                Antes de continuar, lee los documentos y marca tus aceptaciones.
              </p>
              <TermsPanel designed />
            </>
          ) : records.isPending && !saving ? (
            <Loading />
          ) : records.isError ? (
            <section className="panel">
              <p role="alert">{message(records.error)}</p>
              <button onClick={() => void records.refetch()}>
                Volver a consultar
              </button>
            </section>
          ) : stage === 1 ? (
            <JourneyData
              data={data}
              identity={records.data?.identity}
              unit={records.data?.unit}
              disabled={blocked}
              onSaving={setSaving}
              onDone={() => setEditing(false)}
            />
          ) : (
            <JourneyPhotos
              identity={records.data!.identity!}
              unit={records.data!.unit!}
              requirements={requirements}
              disabled={blocked}
              onEdit={() => setEditing(true)}
            />
          )}
        </div>
        <aside className="journey-aside" aria-label="Ayuda para tu registro">
          <span className="journey-aside-icon" aria-hidden="true">
            {stage === 2 ? (
              <Camera size={25} />
            ) : submitted ? (
              <Mail size={25} />
            ) : (
              <FileText size={25} />
            )}
          </span>
          <h2>
            {submitted
              ? '¿Qué sigue?'
              : stage === 2
                ? 'Una buena foto ayuda'
                : 'Ten a la mano'}
          </h2>
          <p>
            {submitted
              ? 'Revisaremos la información que enviaste. Si necesitamos algún ajuste, te avisaremos por correo.'
              : stage === 2
                ? 'Para que podamos leer tus documentos sin dificultad:'
                : 'Prepara lo necesario para completar tu solicitud.'}
          </p>
          {!submitted && (
            <ul>
              {(stage === 2
                ? [
                    'Busca un lugar con buena luz.',
                    'Muestra el documento completo.',
                    'Evita reflejos y fotos borrosas.',
                  ]
                : [
                    'Tu INE vigente.',
                    'Los documentos de tu vehículo.',
                    'Tu licencia, si usas un vehículo motorizado.',
                  ]
              ).map((t) => (
                <li key={t}>
                  <Check size={15} aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          )}
          <div className="journey-save-note">
            <Save size={18} aria-hidden="true" />
            <p>
              {submitted
                ? 'Tu solicitud quedó guardada. Puedes consultar su estado cuando quieras.'
                : 'No tienes que terminar ahora. Puedes volver al avance que hayas guardado.'}
            </p>
          </div>
        </aside>
      </div>
      <footer className="journey-footer">
        <Link to="/profile">Continuar después</Link>
        <Link to="/driver/onboarding?view=details">
          Ver detalle de mis documentos
        </Link>
      </footer>
    </div>
  )
}

function JourneyData({
  data,
  identity,
  unit,
  disabled,
  onSaving,
  onDone,
}: {
  data: Onboarding
  identity?: VerificationCase
  unit?: VerificationCase
  disabled: boolean
  onSaving: (value: boolean) => void
  onDone: () => void
}) {
  const command = useCommand()
  const existing = data.driver.independentProfile?.vehicles[0]
  const [type, setType] = useState(existing?.type || 'MOTORCYCLE')
  const [ownership, setOwnership] = useState(
    unit?.data.ownershipEvidenceType || 'OWNED',
  )
  const motorized = type !== 'BICYCLE'
  return (
    <section className="panel journey-data-panel">
      <div className="journey-panel-heading">
        <h2>Tus datos y tu vehículo</h2>
        <p>Usaremos estos datos para revisar tus documentos.</p>
      </div>
      <Form
        label="Guardar y continuar con las fotos"
        disabled={disabled || command.blocked || command.busy}
        onSubmit={async (form) => {
          onSaving(true)
          const value = (key: string) => String(form.get(key) || '').trim()
          try {
            // Read current resources before every retry; never create a second vehicle or open case blindly.
            const current = await verification.onboarding()
            const id = latest(current)
            const identityId =
              id?.id ||
              (
                await command.send(
                  'CREATE_CASE',
                  current.driver.id,
                  '/driver/verification-cases',
                  {
                    subjectType: 'DRIVER_IDENTITY',
                    subjectId: current.driver.id,
                  },
                )
              ).id
            const currentIdentity = await verification.get(identityId)
            const identityData = {
              fullName: value('fullName'),
              contactPhone: value('contactPhone'),
              documentType: 'INE',
              ...(motorized
                ? {
                    license: {
                      category: value('category'),
                      expiresAt: new Date(
                        value('expiresAt') + 'T23:59:59.999',
                      ).toISOString(),
                      vehicleTypes: [type],
                    },
                  }
                : {}),
            }
            await command.send(
              'UPDATE_CASE',
              identityId,
              '/verification-cases/' + identityId,
              { expectedVersion: currentIdentity.revision, data: identityData },
              'PATCH',
            )
            let vehicleId = current.driver.independentProfile?.vehicles[0]?.id
            if (!vehicleId)
              vehicleId = (
                await command.send(
                  'CREATE_VEHICLE',
                  'SELF',
                  '/driver/onboarding/vehicles',
                  {
                    identifier:
                      'DRV-' +
                      crypto
                        .randomUUID()
                        .replaceAll('-', '')
                        .slice(0, 20)
                        .toUpperCase(),
                    type,
                    ...(motorized
                      ? { plate: value('plate').toUpperCase() }
                      : {}),
                  },
                )
              ).id
            const fresh = await verification.onboarding()
            const unitId =
              latest(fresh, vehicleId)?.id ||
              (
                await command.send(
                  'CREATE_CASE',
                  vehicleId,
                  '/driver/verification-cases',
                  { subjectType: 'VEHICLE', subjectId: vehicleId },
                )
              ).id
            const currentUnit = await verification.get(unitId)
            await command.send(
              'UPDATE_CASE',
              unitId,
              '/verification-cases/' + unitId,
              {
                expectedVersion: currentUnit.revision,
                data: {
                  declaredOwnerName:
                    value('declaredOwnerName') || value('fullName'),
                  serialNumber: value('serialNumber')
                    .replace(/\s/g, '')
                    .toUpperCase(),
                  ownershipEvidenceType: ownership,
                },
              },
              'PATCH',
            )
            onDone()
          } finally {
            onSaving(false)
          }
        }}
      >
        <fieldset className="journey-fieldset">
          <legend>
            <UserRound size={18} aria-hidden="true" /> Sobre ti
          </legend>
          <div className="journey-fields">
            <Field label="Nombre completo">
              <input
                name="fullName"
                autoComplete="name"
                required
                maxLength={150}
                defaultValue={identity?.data.fullName || data.driver.name}
              />
            </Field>
            <Field label="Teléfono de contacto">
              <input
                name="contactPhone"
                type="tel"
                autoComplete="tel"
                required
                minLength={5}
                maxLength={30}
                defaultValue={identity?.data.contactPhone}
                placeholder="Tu número de contacto"
              />
            </Field>
          </div>
        </fieldset>
        <fieldset className="journey-fieldset">
          <legend>
            <Bike size={18} aria-hidden="true" /> Tu vehículo
          </legend>
          <div className="journey-fields">
            <Field label="¿Con qué vas a repartir?">
              <select
                value={type}
                disabled={!!existing}
                onChange={(e) => setType(e.target.value)}
              >
                {['BICYCLE', ...motorTypes].map((t) => (
                  <option key={t} value={t}>
                    {vehicleLabels[t] || t}
                  </option>
                ))}
              </select>
            </Field>
            {motorized && (
              <Field label="Placa">
                <input
                  name="plate"
                  required
                  maxLength={15}
                  pattern="[A-Za-z0-9][A-Za-z0-9 \-]{0,14}"
                  defaultValue={existing?.plate || ''}
                  readOnly={!!existing}
                />
              </Field>
            )}
            <Field label="El vehículo es">
              <select
                value={ownership}
                onChange={(e) =>
                  setOwnership(e.target.value as typeof ownership)
                }
              >
                <option value="OWNED">Propio</option>
                <option value="BORROWED">Prestado</option>
                <option value="RENTED">Rentado</option>
              </select>
            </Field>
            <Field
              label="Nombre del titular"
              hint="Como aparece en los documentos del vehículo."
            >
              <input
                name="declaredOwnerName"
                required
                maxLength={150}
                defaultValue={unit?.data.declaredOwnerName || data.driver.name}
              />
            </Field>
            <Field label="Número de serie del vehículo">
              <input
                name="serialNumber"
                required
                maxLength={150}
                defaultValue={unit?.data.serialNumber}
                placeholder={
                  motorized
                    ? 'VIN o número de serie'
                    : 'Número de serie de tu bicicleta'
                }
              />
            </Field>
          </div>
        </fieldset>
        {motorized && (
          <fieldset className="journey-fieldset">
            <legend>
              <IdCard size={18} aria-hidden="true" /> Tu licencia
            </legend>
            <div className="journey-fields">
              <Field label="Categoría de tu licencia">
                <input
                  name="category"
                  required
                  maxLength={150}
                  defaultValue={identity?.data.license?.category}
                  placeholder="Como aparece en tu licencia"
                />
              </Field>
              <Field label="Vencimiento de tu licencia">
                <input
                  name="expiresAt"
                  type="date"
                  required
                  min={new Date().toLocaleDateString('en-CA')}
                  defaultValue={identity?.data.license?.expiresAt?.slice(0, 10)}
                />
              </Field>
            </div>
          </fieldset>
        )}
      </Form>
    </section>
  )
}

function JourneyPhotos({
  identity,
  unit,
  requirements,
  disabled,
  onEdit,
}: {
  identity: VerificationCase
  unit: VerificationCase
  requirements: Requirements
  disabled: boolean
  onEdit: () => void
}) {
  const command = useCommand()
  const unitRules = unitRequirements(requirements, unit)
  const documents = [
    ...[
      ...requirements.identity.required,
      ...(identity.data.license
        ? [requirements.identity.motorizedLicense]
        : []),
    ].map((category) => ({ record: identity, category })),
    ...unitRules.categories.map((category) => ({ record: unit, category })),
  ]
  const missing = documents.filter(
    ({ record, category }) =>
      !record.attachments.some(
        (a) => a.category === category && a.status === 'VALIDATED',
      ),
  ).length
  return (
    <section className="panel journey-photo-panel">
      <div className="journey-panel-heading journey-photo-heading">
        <div>
          <h2>Tus fotos</h2>
          <p>
            Elige cada foto y se guardará en tu solicitud. Usa imágenes claras,
            completas y sin reflejos.
          </p>
        </div>
        <span className="journey-photo-count">
          {documents.length - missing}
          <span> / {documents.length}</span>
          <small>guardadas</small>
        </span>
      </div>
      <progress
        className="journey-photo-progress"
        value={documents.length - missing}
        max={documents.length || 1}
        aria-label="Fotos guardadas"
      />
      <div className="journey-photos">
        {documents.map(({ record, category }) => (
          <PhotoCard
            key={record.id + category}
            record={record}
            category={category}
            requirements={requirements}
            disabled={disabled || unitRules.blocked}
          />
        ))}
      </div>
      <div className="journey-submit-area">
        <button
          className="journey-edit-button"
          type="button"
          onClick={onEdit}
          disabled={command.blocked || command.busy}
        >
          <PencilLine size={16} aria-hidden="true" /> Revisar mis datos
        </button>
        <p role="status">
          {missing
            ? `Faltan ${missing} fotos por guardar.`
            : 'Tus fotos están guardadas. Envía la solicitud para que podamos revisarla.'}
        </p>
        {unitRules.blocked && (
          <p role="alert">
            Los requisitos del vehículo necesitan actualizarse. Vuelve a
            consultar más tarde.
          </p>
        )}
        <Form
          label="Enviar mi solicitud"
          disabled={
            disabled ||
            missing > 0 ||
            unitRules.blocked ||
            command.blocked ||
            command.busy
          }
          onSubmit={async () => {
            const [a, b] = await Promise.all([
              verification.get(identity.id),
              verification.get(unit.id),
            ])
            await command.send(
              'SUBMIT_ONBOARDING',
              'SELF',
              '/driver/onboarding/submit',
              {
                identityCaseId: a.id,
                identityRevision: a.revision,
                vehicleCaseId: b.id,
                vehicleRevision: b.revision,
              },
            )
          }}
        />
      </div>
    </section>
  )
}

function PhotoCard({
  record,
  category,
  requirements,
  disabled,
}: {
  record: VerificationCase
  category: string
  requirements: Requirements
  disabled: boolean
}) {
  const command = useCommand()
  const lock = useRef(false)
  const alive = useRef(true)
  const request = useRef<AbortController | null>(null)
  const [preview, setPreview] = useState('')
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      request.current?.abort()
    }
  }, [])
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const received = record.attachments.some(
    (a) => a.category === category && a.status === 'VALIDATED',
  )
  const incomplete = record.attachments.find(
    (a) => a.category === category && a.status === 'CREATED',
  )
  const guide = photoGuides[category] || {
    icon: FileText,
    hint: 'Incluye todos los datos, con el texto claro y completo.',
  }
  const Icon = guide.icon
  return (
    <article
      className={'journey-photo' + (received ? ' received' : '')}
      aria-busy={busy}
    >
      <div className="journey-photo-top">
        <span className="journey-photo-icon">
          <Icon size={24} aria-hidden="true" />
        </span>
        <span className="journey-photo-state">
          {received ? (
            <>
              <Check size={13} aria-hidden="true" /> Guardada
            </>
          ) : (
            'Pendiente'
          )}
        </span>
      </div>
      <h3>{labels[category] || category}</h3>
      <p className="journey-photo-hint">{guide.hint}</p>
      {preview && (
        <img
          className="journey-preview"
          src={preview}
          alt={'Vista previa: ' + (labels[category] || category)}
        />
      )}
      {busy ? (
        <p role="status">Guardando foto…</p>
      ) : incomplete ? (
        <>
          <p>Esta carga quedó incompleta.</p>
          <Link to={'/verification/cases/' + record.id}>
            Revisar y completar la carga
          </Link>
        </>
      ) : (
        <label className="journey-photo-input">
          <Camera size={17} aria-hidden="true" />
          {received ? 'Cambiar foto' : 'Tomar o elegir foto'}
          <input
            aria-label={labels[category] || category}
            type="file"
            accept="image/jpeg,image/png"
            disabled={disabled || command.blocked || command.busy}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file || lock.current) return
              lock.current = true
              setBusy(true)
              setError('')
              try {
                validateFile(file, requirements)
                setPreview(URL.createObjectURL(file))
                const controller = new AbortController()
                request.current = controller
                const before = await verification.get(record.id)
                const upload = await command.send(
                  'CREATE_UPLOAD',
                  record.id,
                  `/verification-cases/${record.id}/uploads`,
                  { expectedVersion: before.revision, category },
                )
                if (!upload.uploadUrl || !upload.expiresAt)
                  throw new Error(
                    'No se confirmó la carga. Consulta su estado antes de volver a intentarlo.',
                  )
                if (!alive.current) return
                await putEvidence(
                  upload.uploadUrl,
                  file,
                  upload.expiresAt,
                  controller.signal,
                )
                const latest = await verification.get(record.id)
                await command.send(
                  'COMPLETE_UPLOAD',
                  record.id,
                  `/verification-cases/${record.id}/uploads/${upload.id}/complete`,
                  { expectedVersion: latest.revision },
                )
                for (const old of before.attachments.filter(
                  (a) => a.category === category && a.status === 'VALIDATED',
                )) {
                  const current = await verification.get(record.id)
                  await command.send(
                    'REMOVE_ATTACHMENT',
                    record.id,
                    `/verification-cases/${record.id}/attachments/${old.id}`,
                    { expectedVersion: current.revision },
                    'DELETE',
                  )
                }
              } catch (err) {
                setError(message(err))
              } finally {
                lock.current = false
                setBusy(false)
              }
            }}
          />
        </label>
      )}
      {error && <p role="alert">{error}</p>}
    </article>
  )
}

const photoGuides: Record<string, { icon: typeof Camera; hint: string }> = {
  FACE_PHOTO: {
    icon: UserRound,
    hint: 'Tu rostro de frente, bien iluminado y sin cubrirlo.',
  },
  INE_FRONT: {
    icon: IdCard,
    hint: 'El lado de tu INE donde aparece tu fotografía.',
  },
  INE_BACK: {
    icon: IdCard,
    hint: 'La parte de atrás, con todos los bordes visibles.',
  },
  LICENSE: {
    icon: IdCard,
    hint: 'Que se lean tu nombre, categoría y fecha de vencimiento.',
  },
  REGISTRATION_CARD: {
    icon: FileText,
    hint: 'Que se distingan la placa y los datos del vehículo.',
  },
  RENTAL_CONTRACT: {
    icon: FileText,
    hint: 'La página que acredita el uso del vehículo rentado.',
  },
  OWNER_AUTHORIZATION: {
    icon: FileText,
    hint: 'La autorización del titular para usar su vehículo.',
  },
}
