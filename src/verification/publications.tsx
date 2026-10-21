import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { Field, Loading, Modal } from '../components/ui'
import { Form } from './common'
import { useCommand } from './hooks'
import { vkey } from './format'
import { verification } from './service'
import { LegalText } from './terms'
import type { Publication, PublicationReceipt } from './types'
import { consultationError } from './availability'

export function PublicationPage() {
  const { user } = useAuth()
  return user?.role === 'SUPER_ADMIN' ? (
    <PublicationWorkspace key={user.id} />
  ) : (
    <p role="alert">Sólo SUPER_ADMIN puede consultar y publicar políticas.</p>
  )
}
function PublicationWorkspace() {
  const { user } = useAuth()
  const [receipt, setReceipt] = useState<PublicationReceipt | null>(null)
  const q = useQuery({
    queryKey: vkey(user!.id, 'policy'),
    queryFn: ({ signal }) => verification.policy(signal),
    retry: false,
    gcTime: 0,
  })
  return (
    <>
      <h1>Publicación de términos y privacidad</h1>
      <p>
        El permiso técnico SUPER_ADMIN no equivale a aprobación jurídica. Aporta
        textos completos revisados y la referencia no secreta de autorización de
        esos textos. No hay contenido legal precargado.
      </p>
      <p>
        Publicar crea una versión inmutable y cambia el puntero del ámbito
        elegido. No edita versiones anteriores, no aprueba expedientes ni activa
        la admisión operativa.
      </p>
      {receipt && (
        <section className="notice" role="status">
          <h2>Comprobante histórico de publicación</h2>
          <p>
            {receipt.scope} · {receipt.version} · revisión de política{' '}
            {receipt.policyRevision}. La política vigente se consulta por
            separado debajo.
          </p>
        </section>
      )}
      {q.isPending ? (
        <Loading />
      ) : !q.data ? (
        <>
          <p role="alert">{consultationError(q.error)}</p>
          <button
            onClick={() => {
              void q.refetch()
            }}
          >
            Consultar política vigente
          </button>
        </>
      ) : (
        <>
          {q.isError && <p role="alert">{consultationError(q.error)}</p>}
          <section className="panel panel-body">
            <h2>Política vigente · revisión {q.data.revision}</h2>
            <p>
              Conductor:{' '}
              {q.data.productionDriverTermsVersion ||
                'Sin publicación productiva'}
            </p>
            <p>
              Flotilla:{' '}
              {q.data.productionFleetTermsVersion ||
                'Sin publicación productiva'}
            </p>
            <p>
              Control de admisión:{' '}
              {q.data.enabled ? 'activado por backend' : 'no activado'}.
            </p>
          </section>
          {q.data.runtimeEnvironment !== 'PRODUCTION' ? (
            <p role="alert">
              {q.data.runtimeEnvironment === 'LOCAL_TEST'
                ? 'La publicación no está disponible en modo de prueba. El catálogo de prueba conserva su historia.'
                : 'No se confirmó el entorno de publicación. Actualiza el backend compatible y vuelve a consultar.'}
            </p>
          ) : (
            <PublicationForm
              key={q.data.revision}
              revision={q.data.revision}
              onPublished={setReceipt}
              disabled={q.isFetching || q.isError}
            />
          )}
        </>
      )}
    </>
  )
}
function PublicationForm({
  revision,
  onPublished,
  disabled,
}: {
  revision: number
  onPublished: (r: PublicationReceipt) => void
  disabled: boolean
}) {
  const command = useCommand()
  const [consents, setConsents] = useState<
    { key: number; id: string; text: string }[]
  >([])
  const [nextKey, setNextKey] = useState(0)
  const [authorized, setAuthorized] = useState(false)
  const [pending, setPending] = useState<Publication | null>(null)
  return (
    <section className="panel panel-body">
      <h2>Nueva publicación inmutable</h2>
      <Form
        label="Revisar publicación"
        disabled={disabled || !authorized || command.busy || command.blocked}
        onSubmit={async (d) => {
          const value = (name: string) => String(d.get(name) || '')
          if (
            [value('version'), value('privacyVersion')].some((v) =>
              /LOCAL[-_]TEST/i.test(v),
            )
          )
            throw new Error(
              'Una publicación productiva no puede usar identificadores LOCAL_TEST.',
            )
          if (
            !value('text').trim() ||
            !value('privacyText').trim() ||
            !value('approvalReference').trim() ||
            consents.some((c) => !c.text.trim()) ||
            new Set(consents.map((c) => c.id)).size !== consents.length
          )
            throw new Error(
              'Completa los textos, la autorización y los identificadores únicos de consentimientos.',
            )
          setPending({
            expectedVersion: revision,
            scope: value('scope') as Publication['scope'],
            version: value('version'),
            text: value('text'),
            privacyVersion: value('privacyVersion'),
            privacyText: value('privacyText'),
            specificConsents: consents.map(({ id, text }) => ({ id, text })),
            approvalReference: value('approvalReference'),
            publicationAuthorized: true,
          })
        }}
      >
        <Field label="Ámbito de publicación">
          <select name="scope">
            <option value="DRIVER">Conductor personal</option>
            <option value="FLEET">Representación de flotilla</option>
          </select>
        </Field>
        <Field label="Versión de términos">
          <input
            name="version"
            required
            pattern="[A-Za-z0-9_-]{1,100}"
            maxLength={100}
          />
        </Field>
        <Field label="Texto completo de términos">
          <textarea name="text" required maxLength={60000} rows={10} />
        </Field>
        <Field label="Versión de privacidad">
          <input
            name="privacyVersion"
            required
            pattern="[A-Za-z0-9_-]{1,100}"
            maxLength={100}
          />
        </Field>
        <Field label="Texto completo del aviso de privacidad">
          <textarea name="privacyText" required maxLength={60000} rows={10} />
        </Field>
        <p>
          Sólo los consentimientos específicos exigibles y revisados para este
          ámbito. No inventes finalidades opcionales; si no aplican, la lista
          permanece vacía.
        </p>
        {consents.map((c, i) => (
          <fieldset key={c.key}>
            <legend>Consentimiento específico {i + 1}</legend>
            <Field label={'Identificador de consentimiento ' + (i + 1)}>
              <input
                value={c.id}
                required
                pattern="[A-Za-z0-9_-]{1,60}"
                maxLength={60}
                onChange={(e) =>
                  setConsents(
                    consents.map((x) =>
                      x.key === c.key ? { ...x, id: e.target.value } : x,
                    ),
                  )
                }
              />
            </Field>
            <Field label={'Texto de consentimiento ' + (i + 1)}>
              <textarea
                value={c.text}
                required
                maxLength={12000}
                rows={5}
                onChange={(e) =>
                  setConsents(
                    consents.map((x) =>
                      x.key === c.key ? { ...x, text: e.target.value } : x,
                    ),
                  )
                }
              />
            </Field>
            <button
              type="button"
              onClick={() =>
                setConsents(consents.filter((x) => x.key !== c.key))
              }
            >
              Quitar del borrador: consentimiento {i + 1}
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          disabled={consents.length >= 10}
          onClick={() => {
            setConsents([...consents, { key: nextKey, id: '', text: '' }])
            setNextKey(nextKey + 1)
          }}
        >
          Añadir consentimiento específico
        </button>
        <Field label="Referencia no secreta de autorización">
          <input name="approvalReference" required maxLength={200} />
        </Field>
        <label className="verification-check">
          <input
            type="checkbox"
            checked={authorized}
            onChange={(e) => setAuthorized(e.target.checked)}
          />
          Cuento con autorización explícita de publicación para estos textos
          exactos. El permiso técnico no certifica su validez jurídica.
        </label>
      </Form>
      {pending && (
        <Modal
          title="Confirmar publicación inmutable"
          onClose={() => {
            if (!command.busy) setPending(null)
          }}
        >
          <p>
            Se publicará {pending.version} para{' '}
            {pending.scope === 'DRIVER'
              ? 'Conductor personal'
              : 'Representación de flotilla'}
            , con revisión esperada {pending.expectedVersion}. No se activa la
            admisión.
          </p>
          <LegalText title="Términos a publicar" text={pending.text} />
          <h3>Aviso de privacidad · {pending.privacyVersion}</h3>
          <LegalText title="Privacidad a publicar" text={pending.privacyText} />
          {pending.specificConsents.map((c) => (
            <section key={c.id}>
              <h3>{c.id}</h3>
              <LegalText
                title={'Consentimiento a publicar ' + c.id}
                text={c.text}
              />
            </section>
          ))}
          <p>Autorización: {pending.approvalReference}</p>
          <Form
            label="Publicar versión autorizada"
            disabled={disabled || command.busy || command.blocked}
            onSubmit={async () => {
              const r = await command.send(
                'PUBLISH_TERMS',
                'POLICY',
                '/admin/verification-terms/publications',
                pending,
              )
              onPublished(r)
              setPending(null)
            }}
          />
        </Modal>
      )}
    </section>
  )
}
