import { useId, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { date } from '../utils/format'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { Loading } from '../components/ui'
import { Form } from './common'
import { useCommand } from './hooks'
import { documentaryAvailability } from './availability'
import { useRequirements, useTermsQuery } from './use-availability'
import type { Terms } from './types'
import { provenance, termsKey, completeTerms } from './terms-contract'

export function LegalText({ title, text }: { title: string; text: string }) {
  return (
    <div
      className="verification-terms"
      tabIndex={0}
      role="region"
      aria-label={title}
    >
      {text}
    </div>
  )
}
export function TermsDocuments({ terms }: { terms: Terms }) {
  return (
    <>
      <p>
        Versión: <strong>{terms.version}</strong> · Ámbito:{' '}
        {terms.scope === 'FLEET'
          ? 'Representación de flotilla'
          : 'Conductor personal'}{' '}
        · {provenance(terms.environment)}.
      </p>
      <LegalText title="Texto completo de los términos" text={terms.text} />
      {terms.privacyText && (
        <>
          <h3>Aviso de privacidad · {terms.privacyVersion}</h3>
          <LegalText
            title="Texto completo del aviso de privacidad"
            text={terms.privacyText}
          />
          <p>
            Consultar o reconocer este aviso no otorga todos los
            consentimientos.
          </p>
        </>
      )}
      {!!terms.specificConsents?.length && <h3>Consentimientos específicos</h3>}
      {terms.specificConsents?.map((c) => (
        <section key={c.id}>
          <h4>{c.id}</h4>
          <LegalText
            title={'Consentimiento específico ' + c.id}
            text={c.text}
          />
        </section>
      ))}
    </>
  )
}
function LegalAccordion({
  title,
  version,
  text,
  note,
}: {
  title: string
  version?: string
  text: string
  note: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <section className={'documentary-accordion' + (open ? ' is-open' : '')}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>
          <strong>{title}</strong>
          <small>{version}</small>
        </span>
        <span>
          {open ? 'Ocultar' : 'Leer'} <i aria-hidden="true">⌄</i>
        </span>
      </button>
      <div id={id} hidden={!open}>
        <div
          className="documentary-legal"
          tabIndex={0}
          role="region"
          aria-label={title}
        >
          <Markdown remarkPlugins={[remarkGfm]} skipHtml>
            {text}
          </Markdown>
        </div>
        <p>{note}</p>
      </div>
    </section>
  )
}
function DesignedDocuments({ terms }: { terms: Terms }) {
  return (
    <>
      <div className="documentary-chips">
        <span>Versión: {terms.version}</span>
        <span>Ámbito: Conductor personal</span>
        <span>{provenance(terms.environment)}</span>
      </div>
      <LegalAccordion
        key={'terms:' + terms.version}
        title="Términos de conductor"
        version={terms.version}
        text={terms.text}
        note="Desplázate para leer el texto completo."
      />
      {terms.privacyText && (
        <LegalAccordion
          key={'privacy:' + terms.privacyVersion}
          title="Aviso de privacidad"
          version={terms.privacyVersion ?? undefined}
          text={terms.privacyText}
          note="Consultar o reconocer este aviso no otorga todos los consentimientos."
        />
      )}
      {terms.specificConsents?.map((c) => (
        <LegalAccordion
          key={c.id}
          title="Consentimiento específico"
          version={c.id}
          text={c.text}
          note="Aceptación personal del conductor; no sustituye la aprobación de identidad o de unidades."
        />
      ))}
    </>
  )
}
export function TermsPanel({
  providerId,
  providerName,
  fleetAuthority = false,
  designed = false,
  accepted,
}: {
  providerId?: string
  providerName?: string
  fleetAuthority?: boolean
  designed?: boolean
  accepted?: { id: string; version: string; acceptedAt?: string }
}) {
  const { user } = useAuth()
  const scope = providerId ? 'FLEET' : 'DRIVER'
  const runtime = useRequirements()
  const q = useTermsQuery(providerId)
  const state = documentaryAvailability(runtime, q)
  return (
    <section className="panel panel-body">
      <h2>
        {designed && <span className="documentary-step">2</span>}
        {providerId
          ? `Términos de la flotilla — ${providerName}`
          : 'Términos personales vigentes'}
      </h2>
      {!state.canProceed && (
        <>
          <p role={state.kind === 'loading' ? 'status' : 'alert'}>
            {state.text}
          </p>
          <button
            disabled={runtime.isFetching || q.isFetching}
            onClick={() => {
              void runtime.refetch().then((r) => {
                if (documentaryAvailability(r).canProceed) void q.refetch()
              })
            }}
          >
            Consultar términos
          </button>
        </>
      )}
      {q.isPending && state.kind === 'loading' && <Loading />}
      {q.data && (
        <TermsForm
          key={user!.id + ':' + scope + ':' + providerId}
          terms={q.data}
          providerId={providerId}
          refresh={() => q.refetch()}
          disabled={!state.canProceed || (!!providerId && !fleetAuthority)}
          designed={designed}
          accepted={
            accepted?.version === q.data.version && state.canProceed
              ? accepted
              : undefined
          }
        />
      )}
      {providerId && !fleetAuthority && (
        <p>
          Para aceptar por la flotilla necesitas representación acreditada
          vigente.{' '}
          <Link to="/verification/representatives">
            Consultar mi representación
          </Link>
        </p>
      )}
    </section>
  )
}
export function TermsForm(props: {
  terms: Terms
  providerId?: string
  refresh: () => Promise<unknown>
  disabled?: boolean
  designed?: boolean
  accepted?: { id: string; version: string; acceptedAt?: string }
}) {
  return (
    <AcceptanceForm
      key={termsKey(props.terms) + ':' + props.providerId}
      {...props}
    />
  )
}
function AcceptanceForm({
  terms,
  providerId,
  refresh,
  disabled = false,
  designed = false,
  accepted,
}: {
  terms: Terms
  providerId?: string
  refresh: () => Promise<unknown>
  disabled?: boolean
  designed?: boolean
  accepted?: { id: string; version: string; acceptedAt?: string }
}) {
  const command = useCommand()
  const [checked, setChecked] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [consents, setConsents] = useState<string[]>([])
  const [receipt, setReceipt] = useState('')
  const production = terms.environment === 'PRODUCTION'
  const ready =
    completeTerms(terms) && terms.scope === (providerId ? 'FLEET' : 'DRIVER')
  return (
    <>
      {designed ? (
        <DesignedDocuments terms={terms} />
      ) : (
        <TermsDocuments terms={terms} />
      )}
      {!ready && (
        <p role="alert">
          La publicación está incompleta o no corresponde a este ámbito.
          Consulta de nuevo; no se puede aceptar.
        </p>
      )}
      <p>
        {providerId
          ? 'El representante acepta sólo por esta flotilla. Cada conductor debe aceptar personalmente con su cuenta.'
          : 'Aceptación personal del conductor; no sustituye la aprobación de identidad o de unidades.'}
      </p>
      {accepted && ready ? (
        <p className="documentary-accepted" role="status">
          ✓{' '}
          {accepted.acceptedAt
            ? 'Aceptado el ' + date(accepted.acceptedAt)
            : 'Aceptación vigente'}{' '}
          ·{' '}
          <Link to={'/verification/acceptances/' + accepted.id}>
            Consultar comprobante
          </Link>
        </p>
      ) : (
        <Form
          label={
            (providerId
              ? 'Aceptar por esta flotilla'
              : 'Aceptar personalmente') +
            (terms.environment === 'LOCAL_TEST' ? ' (prueba)' : '')
          }
          disabled={
            disabled ||
            !ready ||
            !checked ||
            (production &&
              (!privacy ||
                consents.length !== terms.specificConsents!.length)) ||
            command.busy ||
            command.blocked
          }
          onSubmit={async () => {
            setReceipt('')
            try {
              const r = await command.send(
                'ACCEPT_TERMS',
                providerId ? 'FLEET:' + providerId : 'DRIVER',
                '/verification-terms/accept',
                {
                  scope: terms.scope,
                  ...(providerId ? { providerId } : {}),
                  version: terms.version,
                  hash: terms.hash,
                  accepted: true,
                  method: 'WEB_CHECKBOX_BUTTON',
                  ...(production
                    ? {
                        privacyVersion: terms.privacyVersion,
                        privacyHash: terms.privacyHash,
                        privacyAcknowledged: true,
                        specificConsents: terms.specificConsents!.map(
                          ({ id, hash }) => ({ id, hash, accepted: true }),
                        ),
                      }
                    : {}),
                },
              )
              setReceipt(r.id)
            } finally {
              setChecked(false)
              setPrivacy(false)
              setConsents([])
              await refresh()
            }
          }}
        >
          <label className="verification-check">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            He leído el texto completo, versión {terms.version}, y acepto
            expresamente los términos de este ámbito.
          </label>
          {production && (
            <label className="verification-check">
              <input
                type="checkbox"
                checked={privacy}
                onChange={(e) => setPrivacy(e.target.checked)}
              />
              He consultado el aviso de privacidad {terms.privacyVersion}. Esta
              declaración no es un consentimiento general.
            </label>
          )}
          {production &&
            terms.specificConsents?.map((c) => (
              <label className="verification-check" key={c.id}>
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
                Otorgo expresamente el consentimiento específico {c.id} descrito
                arriba.
              </label>
            ))}
          {designed && (
            <span className="documentary-counter" aria-live="polite">
              {Number(checked) +
                (production ? Number(privacy) + consents.length : 0)}{' '}
              de {production ? 2 + (terms.specificConsents?.length || 0) : 1}{' '}
              aceptados
            </span>
          )}
        </Form>
      )}
      {receipt && (
        <p role="status">
          Comprobante recibido. Aceptar no aprueba el expediente ni habilita
          operaciones.{' '}
          <Link to={'/verification/acceptances/' + receipt}>
            Consultar texto aceptado
          </Link>
        </p>
      )}
    </>
  )
}
