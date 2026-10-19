import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { Confirm, Field, Loading } from '../components/ui'
import { Form } from './common'
import { labels, message, vkey } from './format'
import { useCommand } from './hooks'
import { verification, isPrivacyReceipt } from './service'
import { LegalText, TermsPanel } from './terms'
import { provenance } from './terms-contract'
import { useRequirements } from './use-availability'
import { documentaryAvailability } from './availability'
import { Evidence } from './evidence'
import { RepresentativeForm } from './representative-form'
import { Decision } from './pages'
import type {
  PrivacyReceipt,
  RepresentativeLink,
  RepresentativePrivacy,
  Requirements,
  VerificationCase,
} from './types'

function useRepresentatives(enabled = true) {
  const { user } = useAuth()
  return useQuery({
    queryKey: vkey(user!.id, 'representatives'),
    queryFn: ({ signal }) => verification.representatives(signal),
    enabled,
    retry: false,
    gcTime: 0,
    refetchInterval: 10000,
  })
}
function usePersonalPrivacy(id: string, enabled: boolean) {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: vkey(user!.id, 'representative-privacy', id),
    queryFn: ({ signal }) => verification.representativePrivacy(id, signal),
    enabled,
    retry: false,
    gcTime: 0,
  })
  const ack = useQuery<PrivacyReceipt | null>({
    queryKey: vkey(user!.id, 'representative-privacy-ack', id),
    queryFn: async () => null,
    enabled: false,
    gcTime: 300000,
  })
  const confirmed =
    enabled &&
    !q.isError &&
    !!q.data &&
    !!ack.data &&
    isPrivacyReceipt(ack.data, id) &&
    ack.data.version === q.data.version &&
    ack.data.privacyHash === q.data.privacyHash &&
    ack.data.privacyVersion === q.data.privacyVersion
  return { q, confirmed, current: confirmed && !q.isFetching }
}
function PrivacyForm({
  document,
  disabled,
}: {
  document: RepresentativePrivacy
  disabled: boolean
}) {
  const command = useCommand()
  const client = useQueryClient()
  const { user } = useAuth()
  const [notice, setNotice] = useState(false)
  const [consents, setConsents] = useState<string[]>([])
  const valid =
    document.scope === 'REPRESENTATIVE_PRIVACY' &&
    document.acceptsFleetContract === false &&
    !!document.privacyText &&
    /^[a-f0-9]{64}$/.test(document.privacyHash)
  return (
    <>
      <p>
        Privacidad personal · versión {document.privacyVersion} ·{' '}
        {provenance(document.environment)}. Esto no acepta el contrato FLEET.
      </p>
      <LegalText
        title="Aviso personal de representación"
        text={document.privacyText}
      />
      {document.specificConsents.map((c) => (
        <section key={c.id}>
          <h3>{c.id}</h3>
          <LegalText title={'Finalidad ' + c.id} text={c.text} />
        </section>
      ))}
      <Form
        label="Confirmar privacidad personal"
        disabled={
          disabled ||
          !valid ||
          !notice ||
          consents.length !== document.specificConsents.length ||
          command.blocked ||
          command.busy
        }
        onSubmit={async () => {
          try {
            const receipt = await command.send(
              'REPRESENTATIVE_PRIVACY',
              document.subjectId,
              `/fleet-representatives/${document.subjectId}/privacy/acknowledge`,
              {
                version: document.version,
                privacyVersion: document.privacyVersion,
                privacyHash: document.privacyHash,
                privacyAcknowledged: true,
                specificConsents: document.specificConsents.map(
                  ({ id, hash }) => ({ id, hash, accepted: true }),
                ),
              },
            )
            client.setQueryData(
              vkey(user!.id, 'representative-privacy-ack', document.subjectId),
              receipt,
            )
          } finally {
            setNotice(false)
            setConsents([])
          }
        }}
      >
        <label className="verification-check">
          <input
            type="checkbox"
            checked={notice}
            onChange={(e) => setNotice(e.target.checked)}
          />
          He consultado el aviso personal. No es un consentimiento general.
        </label>
        {document.specificConsents.map((c) => (
          <label key={c.id} className="verification-check">
            <input
              type="checkbox"
              checked={consents.includes(c.id)}
              onChange={(e) =>
                setConsents(
                  e.target.checked
                    ? [...consents, c.id]
                    : consents.filter((id) => id !== c.id),
                )
              }
            />
            Otorgo el consentimiento específico {c.id} descrito arriba.
          </label>
        ))}
      </Form>
    </>
  )
}
function PrivacyPanel({
  privacy,
}: {
  privacy: ReturnType<typeof usePersonalPrivacy>
}) {
  return (
    <section className="panel panel-body">
      <h2>Privacidad antes de preparar el expediente</h2>
      {privacy.q.isPending ? (
        <Loading />
      ) : privacy.q.isError ? (
        <>
          <p role="alert">{message(privacy.q.error)}</p>
          <button onClick={() => void privacy.q.refetch()}>
            Consultar aviso personal
          </button>
        </>
      ) : privacy.current ? (
        <p role="status">
          Privacidad personal confirmada para esta versión. No acredita
          representación ni aceptación FLEET.
        </p>
      ) : (
        <PrivacyForm
          key={JSON.stringify([
            privacy.q.data.version,
            privacy.q.data.privacyHash,
            privacy.q.data.specificConsents,
          ])}
          document={privacy.q.data}
          disabled={privacy.q.isFetching}
        />
      )}
    </section>
  )
}
export function RepresentativesPage() {
  const { subjectId } = useParams()
  const [search] = useSearchParams()
  const q = useRepresentatives()
  const items =
    q.data?.items.filter(
      (item) =>
        !search.get('providerId') ||
        item.providerId === search.get('providerId'),
    ) || []
  return (
    <>
      <h1>Representación legal de flotilla</h1>
      <p>
        El vínculo permite preparar tu expediente; no concede facultades
        contractuales ni permisos de coordinación. Cada conductor acepta
        personalmente sus términos.
      </p>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <>
          <p role="alert">{message(q.error)}</p>
          <button onClick={() => void q.refetch()}>Consultar vínculos</button>
        </>
      ) : subjectId ? (
        (() => {
          const link = q.data.items.find((item) => item.id === subjectId)
          return link ? (
            <RepresentativeHome key={link.id} link={link} />
          ) : (
            <p role="alert">
              Este vínculo no está disponible para tu cuenta. Solicita a la
              administración que revise la vinculación.
            </p>
          )
        })()
      ) : items.length ? (
        <ul>
          {items.map((link) => (
            <li key={link.id}>
              <Link to={'/verification/representatives/' + link.id}>
                Flotilla {link.providerId}
              </Link>{' '}
              ·{' '}
              {link.status === 'REVOKED'
                ? 'Vínculo revocado'
                : link.restricted
                  ? 'Acceso documental restringido'
                  : 'Vínculo disponible'}
            </li>
          ))}
        </ul>
      ) : (
        <p>
          No tienes un vínculo de representación disponible. Solicita a la
          administración que lo revise; un rol de coordinador no acredita
          facultades.
        </p>
      )}
    </>
  )
}
function RepresentativeHome({ link }: { link: RepresentativeLink }) {
  const { user } = useAuth()
  const runtime = useRequirements()
  const active = link.status === 'LINKED' && !link.restricted
  const privacy = usePersonalPrivacy(
    link.id,
    active && documentaryAvailability(runtime).canProceed,
  )
  const command = useCommand()
  const navigate = useNavigate()
  const open = link.cases.some((c) => ['DRAFT', 'SUBMITTED'].includes(c.status))
  return (
    <>
      <p>
        Cuenta: {user!.email} · Flotilla:{' '}
        <span className="mono">{link.providerId}</span>. El titular o razón
        social se declara en el expediente; el identificador no acredita
        autoridad.
      </p>
      {!active ? (
        <RestrictedRepresentative />
      ) : (
        <>
          <PrivacyPanel privacy={privacy} />
          <Form
            label="Crear expediente de representación"
            disabled={
              !privacy.current || open || command.busy || command.blocked
            }
            onSubmit={async () => {
              const receipt = await command.send(
                'CREATE_CASE',
                link.id,
                `/fleet-representatives/${link.id}/cases`,
                undefined,
              )
              navigate('/verification/cases/' + receipt.id)
            }}
          />
          {open && (
            <p>
              Continúa el expediente abierto; no se crea otro mientras esté en
              borrador o revisión.
            </p>
          )}
          <p>
            Aprobar la representación no acepta términos ni activa admisión.
          </p>
          {link.canAcceptFleet && (
            <TermsPanel
              providerId={link.providerId}
              providerName={link.providerId}
              fleetAuthority={active && link.canAcceptFleet}
            />
          )}
        </>
      )}
      <h2>Expedientes propios e historial</h2>
      <ul>
        {active &&
          link.cases.map((c) => (
            <li key={c.id}>
              <Link to={'/verification/cases/' + c.id}>
                {labels[c.status]} · revisión {c.revision}
              </Link>{' '}
              · {provenance(c.environment)}
            </li>
          ))}
      </ul>
      <p>
        Los recibos históricos no prueban facultades actuales. Un sustituto
        prepara su expediente sin heredar imágenes.
      </p>
    </>
  )
}
function RestrictedRepresentative() {
  return (
    <aside className="notice">
      <p role="alert">
        El vínculo está revocado o su documentación está restringida. No se
        permiten nuevas cargas ni consultas privadas desde este expediente.
      </p>
      <p>
        Conserva los intentos pendientes: si su consulta requiere un vínculo
        vigente, se necesita atención administrativa; no repitas la operación.
      </p>
      <Link to="/privacy/deletion">
        Seguimiento de baja y constancias de alcance limitado
      </Link>
      <p>
        Las restricciones actuales y las incidencias son independientes de un
        recibo histórico. La UI no cancela servicios comprometidos ni restaura
        permisos.
      </p>
    </aside>
  )
}
export function RepresentativeCase({
  record,
  requirements,
}: {
  record: VerificationCase
  requirements: Requirements
}) {
  const { user } = useAuth()
  const admin = user!.role === 'SUPER_ADMIN'
  const links = useRepresentatives(!admin)
  const link = links.data?.items.find((s) => s.id === record.resourceId)
  const active =
    !!link && !links.isError && link.status === 'LINKED' && !link.restricted
  const runtimeReady =
    documentaryAvailability({ data: requirements }).canProceed &&
    !!requirements.representative
  const privacy = usePersonalPrivacy(
    record.resourceId,
    !admin && active && runtimeReady,
  )
  const command = useCommand()
  const [confirm, setConfirm] = useState<'SUBMIT' | 'WITHDRAW' | null>(null)
  const current =
    record.environment === requirements.environment &&
    record.policyVersion === requirements.policyVersion
  if (!admin && links.isPending) return <Loading />
  if (!admin && !active)
    return (
      <>
        <h1>Representación legal</h1>
        {links.isError ? (
          <p role="alert">{message(links.error)}</p>
        ) : (
          <RestrictedRepresentative />
        )}
      </>
    )
  const editable = !admin && current && record.status === 'DRAFT'
  const ready = runtimeReady && privacy.current
  // Background revalidation blocks submission without discarding a pending file.
  // A different version, error or loss of authority still removes collection.
  const canCollect = runtimeReady && privacy.confirmed
  return (
    <>
      <h1>Representación legal · {labels[record.status]}</h1>
      <p>
        Flotilla: <span className="mono">{record.scope.providerId}</span> ·
        Revisión {record.revision} · {provenance(record.environment)}.
      </p>
      <p>
        Resultado documental:{' '}
        {labels[record.verificationStatus] || record.verificationStatus}. La
        aceptación FLEET, la aprobación de conductor/unidad y la admisión son
        decisiones separadas.
      </p>
      {!current && (
        <p role="alert">
          Expediente histórico: no se convierte automáticamente en productivo ni
          se copian documentos.
        </p>
      )}
      {!runtimeReady && (
        <p role="alert">
          Los requisitos actuales no permiten continuar este expediente.
          Consulta de nuevo.
        </p>
      )}
      {record.publicReason && (
        <p role="status">Motivo de decisión: {record.publicReason}</p>
      )}
      {admin && record.internalNote && (
        <p>Nota interna: {record.internalNote}</p>
      )}
      {!admin && <PrivacyPanel privacy={privacy} />}
      {editable && canCollect ? (
        <RepresentativeForm
          key={record.id + ':' + record.revision}
          record={record}
          disabled={!ready}
        />
      ) : (
        <section className="panel panel-body">
          <h2>Información presentada</h2>
          <dl>
            <dt>Compareciente</dt>
            <dd>{record.data.fullName || 'Sin datos guardados'}</dd>
            <dt>Persona representada</dt>
            <dd>{record.data.representedName || 'Sin datos guardados'}</dd>
            <dt>Actuación</dt>
            <dd>{labels[record.data.capacity || ''] || 'Sin declarar'}</dd>
            <dt>Límites</dt>
            <dd>{record.data.limits || 'Sin límites declarados'}</dd>
            <dt>Firma conjunta</dt>
            <dd>
              {record.data.jointSignatureRequired
                ? 'Requiere resolución; no basta aceptación individual'
                : 'No declarada'}
            </dd>
            <dt>Vigencia de identidad</dt>
            <dd>{record.data.identityValidUntil || 'Sin declarar'}</dd>
            <dt>Inicio de facultades</dt>
            <dd>{record.data.authorityValidFrom || 'Sin declarar'}</dd>
            <dt>Fin de facultades</dt>
            <dd>{record.data.authorityValidUntil || 'Sin límite declarado'}</dd>
            <dt>Declaración de vigencia</dt>
            <dd>
              {record.data.declarationCurrent
                ? 'Registrada en esta revisión'
                : 'Pendiente'}
            </dd>
          </dl>
          <h3>Páginas de facultades, orden declarado</h3>
          <ol>
            {record.data.authorityPages?.map((id) => (
              <li className="mono" key={id}>
                {id}
              </li>
            ))}
          </ol>
        </section>
      )}
      <Evidence
        record={record}
        requirements={requirements}
        canWrite={editable && canCollect}
        disabled={!ready || !current}
        removalDisabled={!runtimeReady}
      />
      {!admin && (
        <p>
          <Link to={'/verification/representatives/' + record.resourceId}>
            Volver al vínculo y aceptación FLEET
          </Link>
        </p>
      )}
      {!admin && ['DRAFT', 'SUBMITTED'].includes(record.status) && (
        <section className="panel panel-body">
          <p>
            Antes de presentar, revisa los datos guardados, la declaración
            vigente y todas las evidencias confirmadas en el orden correcto.
          </p>
          {editable && (
            <button
              disabled={!ready || command.blocked || command.busy}
              onClick={() => setConfirm('SUBMIT')}
            >
              Presentar representación para revisión
            </button>
          )}{' '}
          <button
            disabled={!runtimeReady || command.blocked || command.busy}
            onClick={() => setConfirm('WITHDRAW')}
          >
            Retirar expediente
          </button>
        </section>
      )}
      {admin && current && record.status === 'SUBMITTED' && (
        <Decision
          key={record.revision}
          record={record}
          requirements={requirements}
          disabled={!runtimeReady}
        />
      )}
      <section className="panel panel-body">
        <h2>Historial del expediente</h2>
        <ul>
          {record.events.map((e) => (
            <li key={e.id}>
              {labels[e.kind] || 'Actividad documental'} ·{' '}
              {new Date(e.createdAt).toLocaleString('es-MX')}
            </li>
          ))}
        </ul>
      </section>
      {confirm && (
        <Confirm
          title={
            confirm === 'SUBMIT'
              ? 'Presentar representación'
              : 'Retirar expediente'
          }
          description="Se actuará sobre la revisión consultada. Presentar no acredita facultades ni acepta FLEET. Retirar no borra los archivos."
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            if (!runtimeReady || (confirm === 'SUBMIT' && !ready))
              throw new Error('Consulta y confirma los requisitos vigentes.')
            await command.send(
              confirm,
              record.id,
              `/verification-cases/${record.id}/${confirm === 'SUBMIT' ? 'submit' : 'withdraw'}`,
              { expectedVersion: record.revision },
            )
          }}
        />
      )}
    </>
  )
}
export function AdminRepresentatives() {
  const command = useCommand()
  const [result, setResult] = useState('')
  const [pending, setPending] = useState<{
    action: 'LINK_REPRESENTATIVE' | 'REVOKE_REPRESENTATIVE'
    target: string
    body: Record<string, unknown>
  } | null>(null)
  return (
    <>
      <h1>Vínculos de representación legal</h1>
      <p>
        Sólo SUPER_ADMIN. Identifica la cuenta y flotilla correctas. Vincular no
        concede membresía, facultades ni admisión. Revocar es irreversible para
        ese vínculo y no cancela servicios.
      </p>
      <Form
        label="Revisar vinculación"
        disabled={command.blocked || command.busy}
        onSubmit={async (d) =>
          setPending({
            action: 'LINK_REPRESENTATIVE',
            target: String(d.get('userId')),
            body: {
              userId: String(d.get('userId')),
              providerId: String(d.get('providerId')),
            },
          })
        }
      >
        <Field label="Identificador de cuenta con correo confirmado">
          <input name="userId" required pattern="[a-fA-F0-9-]{36}" />
        </Field>
        <Field label="Identificador de flotilla">
          <input name="providerId" required pattern="[a-fA-F0-9-]{36}" />
        </Field>
      </Form>
      <details>
        <summary>Revocar un vínculo identificado</summary>
        <Form
          label="Revisar revocación"
          disabled={command.blocked || command.busy}
          onSubmit={async (d) =>
            setPending({
              action: 'REVOKE_REPRESENTATIVE',
              target: String(d.get('subjectId')),
              body: {
                expectedVersion: Number(d.get('revision')),
                reason: String(d.get('reason')).trim(),
              },
            })
          }
        >
          <Field label="Identificador del vínculo">
            <input name="subjectId" required pattern="[a-fA-F0-9-]{36}" />
          </Field>
          <Field label="Revisión esperada del vínculo">
            <input name="revision" type="number" required min={1} />
          </Field>
          <Field label="Motivo comunicable de revocación">
            <textarea name="reason" required maxLength={500} />
          </Field>
          <p>
            Usa la referencia y revisión confirmadas; no se deducen de la
            revisión del expediente. No copies datos de INE o poderes en el
            motivo.
          </p>
        </Form>
      </details>
      {pending && (
        <Confirm
          title={
            pending.action === 'LINK_REPRESENTATIVE'
              ? 'Confirmar vínculo documental'
              : 'Confirmar revocación'
          }
          description={
            pending.action === 'LINK_REPRESENTATIVE'
              ? `Cuenta ${pending.target}; flotilla ${String(pending.body.providerId)}. Sólo abre preparación documental.`
              : `Vínculo ${pending.target}; revisión ${String(pending.body.expectedVersion)}. La revocación no aprueba al sustituto ni elimina documentos.`
          }
          onClose={() => setPending(null)}
          onConfirm={async () => {
            const receipt = await command.send(
              pending.action,
              pending.target,
              pending.action === 'LINK_REPRESENTATIVE'
                ? '/admin/fleet-representatives'
                : `/admin/fleet-representatives/${pending.target}/revoke`,
              pending.body,
            )
            setResult(
              `Comprobante histórico: ${receipt.id}; ${receipt.status === 'LINKED' ? 'vínculo creado' : 'vínculo revocado'}; revisión ${receipt.revision}. No demuestra facultades vigentes.`,
            )
          }}
        />
      )}
      {result && <p role="status">{result}</p>}
      <p>
        <Link to="/admin/verification-cases">Revisar expedientes</Link>
      </p>
    </>
  )
}
