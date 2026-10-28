import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ActionForm, Field, InfoGrid } from '../components/ui'
import { date } from '../utils/format'
import type { ConsentContext } from './reconciliation-contract'
import type { OwnedShippingTermsResponse } from './contract'

export function RequestConsent({
  context,
  contact,
  accepted,
  terminal,
  ready,
  now,
  onAccept,
}: {
  context?: ConsentContext
  contact?: OwnedShippingTermsResponse['payerContact']
  accepted: boolean
  terminal: boolean
  ready: boolean
  now: number
  onAccept: () => Promise<void>
}) {
  const [confirmed, setConfirmed] = useState(false)
  const quote = context?.quote,
    terms = context?.shippingTerms
  const expired =
    !!quote &&
    (!Number.isFinite(Date.parse(quote.expiresAt)) ||
      Date.parse(quote.expiresAt) <= now ||
      quote.status === 'EXPIRED')
  return (
    <>
      {quote && !accepted && !terminal && (
        <section className="request-price" aria-label="Importe a autorizar">
          <span>Importe a autorizar</span>
          <div>
            <strong>${quote.amount}</strong> <b>{quote.currency}</b>
          </div>
          <p>Vence: {date(quote.expiresAt)}</p>
          {expired && (
            <div role="alert" className="request-expired">
              La cotización ha vencido.
              <Link to="/customer/new">Volver a cotizar</Link>
              <small>
                Una cotización vencida no libera el cupo de esta solicitud.
              </small>
            </div>
          )}
        </section>
      )}
      <section
        className="request-card request-consent"
        aria-label="Autorización del envío"
      >
        <h2>Revisar y autorizar envío</h2>
        {accepted ? (
          <p className="request-success" role="status">
            Autorización confirmada por el servidor. Puedes consultar el
            seguimiento del servicio.
          </p>
        ) : terminal ? (
          <p>
            Solicitud finalizada. No se puede autorizar otro envío desde esta
            solicitud.
          </p>
        ) : (
          <>
            <p>
              La disponibilidad para consentir no reserva cupo ni garantiza las
              condiciones al enviar. El servidor volverá a validarlas.
            </p>
            {terms && (
              <InfoGrid
                items={[
                  ...(contact
                    ? ([
                        ['Persona que pagará', contact.name],
                        ['Contacto', contact.phone],
                        [
                          'Capacidad',
                          contact.capacity === 'REQUESTER'
                            ? 'Solicitante'
                            : 'Representante autorizado',
                        ],
                      ] as [string, string][])
                    : []),
                  [
                    'Pagador',
                    terms.payer === 'REQUESTER'
                      ? 'Solicitante o representante'
                      : 'Destinatario',
                  ],
                  [
                    'Forma de pago',
                    `En efectivo · ${terms.dueAt === 'PICKUP' ? 'En recogida' : 'Al entregar'}`,
                  ],
                ]}
              />
            )}
            {quote && terms ? (
              <ActionForm
                submitLabel="Autorizar y solicitar servicio"
                submitDisabled={!ready || expired || !confirmed}
                onSubmit={async () => {
                  if (!ready || expired || !confirmed) return
                  await onAccept()
                }}
              >
                <Field label="Acepto el importe, vigencia y condiciones del envío">
                  <input
                    type="checkbox"
                    required
                    disabled={!ready || expired}
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                </Field>
              </ActionForm>
            ) : (
              <p role="status">
                No hay una cotización vigente con términos completos para
                autorizar. Actualiza el estado; no se aceptará automáticamente.
              </p>
            )}
          </>
        )}
      </section>
    </>
  )
}

export function RequestCancellation({
  blocked,
  terminal,
  cancelled,
  onCancel,
}: {
  blocked: boolean
  terminal: boolean
  cancelled: boolean
  onCancel: (reason: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [reason, setReason] = useState('')
  if (terminal && !cancelled) return null
  return (
    <section className="request-cancel" aria-label="Cancelar solicitud">
      <button
        type="button"
        className="request-cancel-toggle"
        aria-expanded={open || cancelled}
        onClick={() => setOpen(!open)}
      >
        <span>
          <strong>Cancelar solicitud</strong>
          <small>
            La custodia puede impedir la cancelación. Una cotización vencida no
            libera cupo. Confirma el resultado antes de otra solicitud.
          </small>
        </span>
        <span aria-hidden="true">{open || cancelled ? '−' : '+'}</span>
      </button>
      {cancelled ? (
        <p role="status">Solicitud cancelada según el estado del servidor.</p>
      ) : blocked ? (
        <p className="notice">
          La solicitud está bajo custodia o requiere atención. No se ofrece
          cancelación ordinaria; una incidencia no libera el cupo.
        </p>
      ) : (
        open && (
          <ActionForm
            submitLabel="Solicitar cancelación"
            submitDisabled={!confirmed || reason.trim().length < 3}
            onSubmit={async () => {
              if (!confirmed) return
              await onCancel(reason)
            }}
          >
            <Field label="Motivo de cancelación *">
              <input
                name="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Cuéntanos por qué cancelas"
                required
                minLength={3}
                maxLength={500}
              />
            </Field>
            <Field label="Confirmo que deseo cancelar">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
            </Field>
          </ActionForm>
        )
      )}
    </section>
  )
}
