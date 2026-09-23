import { useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, Coins } from 'lucide-react'
import {
  ActionForm,
  Empty,
  ErrorState,
  Field,
  InfoGrid,
  Loading,
  Modal,
  Pagination,
  Table,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { ApiError } from '../services/errors'
import { date } from '../utils/format'
import type { Page } from '../types/api'
import {
  formatCredits,
  formatLedgerType,
  formatRechargeMethod,
  signedCredits,
} from './format'
import {
  independentCreditsAdmin,
  movementKey,
  providerCreditsAdmin,
} from './service'
import { creditKeys, refreshCredits } from './queries'
import {
  CREDIT_REASON_MAX,
  CREDIT_REASON_MIN,
  CREDIT_REFERENCE_MAX,
  MAX_CREDIT_MOVEMENT,
  rechargeMethods,
  type AdjustmentInput,
  type AdminCreditLedgerEntry,
  type CreditAccount,
  type CreditLedgerEntry,
  type CreditMovement,
  type RechargeInput,
  type RechargeMethod,
} from './types'

const ownerTypeLabels = {
  PROVIDER: 'Cuenta del proveedor (la comparten sus repartidores de flotilla)',
  INDEPENDENT_DRIVER: 'Cuenta del repartidor independiente',
}
const isMissingAccount = (error: unknown) =>
  error instanceof ApiError &&
  (error.code === 'CREDIT_ACCOUNT_NOT_FOUND' || error.status === 404)

/** The balance always comes from the backend; the web never derives or accumulates it. */
export function CreditBalance({
  account,
  note,
}: {
  account: CreditAccount
  note?: ReactNode
}) {
  return (
    <div className="credit-balance">
      <span className="credit-balance-label">
        <Coins size={16} aria-hidden="true" /> Saldo actual
      </span>
      <strong className="credit-amount">
        {formatCredits(account.balance)}
      </strong>
      <small>{ownerTypeLabels[account.ownerType]}</small>
      <small>Actualizado {date(account.updatedAt)}</small>
      {note}
    </div>
  )
}

/**
 * A missing credit account is a real contract answer, not a zero balance: a fleet driver uses the
 * provider's account and an independent driver only gets one when the profile is approved.
 */
export function MissingAccount({
  error,
  retry,
  description,
}: {
  error: unknown
  retry: () => void
  description: string
}) {
  if (!isMissingAccount(error))
    return <ErrorState error={error} retry={retry} />
  return (
    <Empty
      title="Sin cuenta de créditos"
      description={description}
      action={
        <button className="button secondary" onClick={retry}>
          Reintentar
        </button>
      }
    />
  )
}

function serviceReference(
  entry: CreditLedgerEntry,
  link: 'admin' | 'none' = 'none',
) {
  if (entry.referenceType !== 'DISPATCH' || !entry.referenceId) return null
  return link === 'admin' ? (
    <Link to={`/dispatches/${encodeURIComponent(entry.referenceId)}`}>
      Servicio del despacho
    </Link>
  ) : (
    <span className="muted">Servicio adjudicado</span>
  )
}
/**
 * Immutable history: every movement is shown as it was written. A SERVICE_REFUND never replaces
 * or edits its SERVICE_AWARD — both lines stay visible, so the charge and its return are auditable.
 */
export function CreditLedger({
  items,
  admin = false,
}: {
  items: (CreditLedgerEntry | AdminCreditLedgerEntry)[]
  admin?: boolean
}) {
  return (
    <Table
      stacked
      rows={items}
      emptyTitle="No hay movimientos todavía."
      empty="Aquí aparecerán las recargas, los cargos por servicio y los ajustes administrativos."
      columns={[
        { label: 'Fecha', render: (row) => date(row.createdAt) },
        {
          label: 'Movimiento',
          render: (row) => (
            <div className="ledger-kind">
              <strong>{formatLedgerType(row.type)}</strong>
              {serviceReference(row, admin ? 'admin' : 'none')}
              {row.reason && <small>{row.reason}</small>}
              {row.type === 'RECHARGE' && (
                <small>
                  {formatRechargeMethod(row.rechargeMethod)}
                  {row.externalReference ? ` · ${row.externalReference}` : ''}
                </small>
              )}
              {admin && 'createdByUserId' in row && (
                <small className="muted">
                  {row.createdByUserId
                    ? `Registrado por ${row.createdByUserId}`
                    : 'Registrado por Mandaria al adjudicar el servicio'}
                </small>
              )}
            </div>
          ),
        },
        {
          label: 'Créditos',
          render: (row) => (
            <span
              className={`ledger-amount ${row.amount > 0 ? 'positive' : 'negative'}`}
            >
              {signedCredits(row.amount)}
            </span>
          ),
        },
        {
          label: 'Saldo resultante',
          render: (row) => formatCredits(row.balanceAfter),
        },
      ]}
    />
  )
}

function reasonField(required: boolean) {
  return (
    <Field
      label={required ? 'Motivo' : 'Motivo (opcional)'}
      hint={`Entre ${CREDIT_REASON_MIN} y ${CREDIT_REASON_MAX} caracteres. Queda en el historial y lo ve el dueño de la cuenta: no incluyas datos personales.`}
    >
      <textarea name="reason" rows={3} maxLength={CREDIT_REASON_MAX} />
    </Field>
  )
}
function readReason(data: FormData, required: boolean) {
  const reason = String(data.get('reason') ?? '').trim()
  if (!reason) {
    if (required)
      throw new ApiError(
        400,
        `Describe el motivo con al menos ${CREDIT_REASON_MIN} caracteres.`,
      )
    return undefined
  }
  if (reason.length < CREDIT_REASON_MIN)
    throw new ApiError(
      400,
      `El motivo debe tener entre ${CREDIT_REASON_MIN} y ${CREDIT_REASON_MAX} caracteres.`,
    )
  return reason
}
function readCredits(value: FormDataEntryValue | null, allowNegative: boolean) {
  const credits = Number(String(value ?? '').trim())
  if (!Number.isInteger(credits) || credits === 0)
    throw new ApiError(
      400,
      allowNegative
        ? 'Escribe un número entero de créditos distinto de cero.'
        : 'Escribe un número entero de créditos mayor que cero.',
    )
  if (!allowNegative && credits < 0)
    throw new ApiError(400, 'Una recarga sólo puede sumar créditos.')
  if (Math.abs(credits) > MAX_CREDIT_MOVEMENT)
    throw new ApiError(
      400,
      `Un movimiento admite como máximo ${MAX_CREDIT_MOVEMENT.toLocaleString('es-MX')} créditos.`,
    )
  return credits
}

/**
 * Same key while the operator confirms the same movement, a new one as soon as the movement
 * changes: retrying after a network error returns the original entry instead of charging twice,
 * and editing the amount never collides with the previous key.
 */
function useMovementKey() {
  const current = useRef<{ payload: string; key: string } | null>(null)
  return (payload: unknown) => {
    const serialized = JSON.stringify(payload)
    if (current.current?.payload !== serialized)
      current.current = { payload: serialized, key: movementKey() }
    return current.current.key
  }
}

type MovementApi = {
  recharge: (
    ownerId: string,
    input: RechargeInput,
    key: string,
  ) => Promise<CreditMovement>
  adjustment: (
    ownerId: string,
    input: AdjustmentInput,
    key: string,
  ) => Promise<CreditMovement>
}

/** Commercial recharge: SUPER_ADMIN registers credits after the payment was confirmed outside. */
function RechargeDialog({
  scope,
  ownerId,
  ownerName,
  api,
  onClose,
}: {
  scope: string
  ownerId: string
  ownerName: string
  api: MovementApi
  onClose: () => void
}) {
  const notify = useFeedback()
  const [draft, setDraft] = useState<RechargeInput | null>(null)
  const [method, setMethod] = useState<RechargeMethod>('TRANSFER')
  const keyFor = useMovementKey()
  return (
    <Modal title="Registrar recarga de créditos" onClose={onClose}>
      {draft ? (
        <>
          <p className="modal-description">
            Revisa el movimiento antes de registrarlo. Mandaria no procesa el
            pago: sólo registra los créditos ya confirmados.
          </p>
          <InfoGrid
            items={[
              ['Destinatario', ownerName],
              ['Créditos a sumar', formatCredits(draft.credits)],
              ['Medio de pago', formatRechargeMethod(draft.method)],
              [
                'Referencia externa',
                draft.externalReference ?? 'Sin referencia',
              ],
              ['Motivo', draft.reason ?? 'Sin motivo'],
            ]}
          />
          <ActionForm
            initialDirty
            submitLabel="Registrar recarga"
            cancelLabel="Volver"
            onCancel={() => setDraft(null)}
            onSubmit={async () => {
              const movement = await api.recharge(ownerId, draft, keyFor(draft))
              await refreshCredits(scope, ownerId)
              notify(
                `Recarga registrada: ${signedCredits(movement.entry.amount)}.`,
              )
              onClose()
            }}
          >
            {null}
          </ActionForm>
        </>
      ) : (
        <>
          <p className="modal-description">
            Registra los créditos después de confirmar el pago por el medio
            administrativo correspondiente. Los créditos Mandaria no son dinero
            ni se convierten a pesos.
          </p>
          <ActionForm
            initialDirty
            submitLabel="Continuar"
            cancelLabel="Cancelar"
            onCancel={onClose}
            onSubmit={async (data) => {
              const credits = readCredits(data.get('credits'), false)
              const reason = readReason(data, method === 'OTHER')
              const reference = String(
                data.get('externalReference') ?? '',
              ).trim()
              setDraft({
                credits,
                method,
                ...(reference ? { externalReference: reference } : {}),
                ...(reason ? { reason } : {}),
              })
            }}
          >
            <Field
              label="Créditos a sumar"
              hint={`Número entero entre 1 y ${MAX_CREDIT_MOVEMENT.toLocaleString('es-MX')}. Son créditos Mandaria, no pesos.`}
            >
              <input
                name="credits"
                type="number"
                min={1}
                max={MAX_CREDIT_MOVEMENT}
                step={1}
                required
              />
            </Field>
            <Field label="Medio de pago confirmado">
              <select
                name="method"
                value={method}
                onChange={(event) =>
                  setMethod(event.target.value as RechargeMethod)
                }
              >
                {rechargeMethods.map((value) => (
                  <option key={value} value={value}>
                    {formatRechargeMethod(value)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Referencia externa (opcional)"
              hint="Folio del pago, por ejemplo la referencia de la transferencia. Nunca datos de tarjeta."
            >
              <input
                name="externalReference"
                maxLength={CREDIT_REFERENCE_MAX}
                autoComplete="off"
              />
            </Field>
            {reasonField(method === 'OTHER')}
          </ActionForm>
        </>
      )}
    </Modal>
  )
}

/** Administrative correction. It is not a second way of recharging: it can also subtract. */
function AdjustmentDialog({
  scope,
  ownerId,
  ownerName,
  balance,
  api,
  onClose,
}: {
  scope: string
  ownerId: string
  ownerName: string
  balance: number
  api: MovementApi
  onClose: () => void
}) {
  const notify = useFeedback()
  const [draft, setDraft] = useState<AdjustmentInput | null>(null)
  const keyFor = useMovementKey()
  return (
    <Modal title="Ajuste administrativo de créditos" onClose={onClose}>
      {draft ? (
        <>
          <p className="modal-description">
            Revisa la corrección antes de aplicarla. Queda registrada en el
            historial y no puede editarse después.
          </p>
          <InfoGrid
            items={[
              ['Cuenta', ownerName],
              ['Ajuste', signedCredits(draft.amount)],
              ['Saldo antes del ajuste', formatCredits(balance)],
              ['Motivo', draft.reason],
            ]}
          />
          {draft.amount < 0 && (
            <p className="warning notice" role="note">
              <AlertTriangle size={16} aria-hidden="true" />
              Este ajuste disminuye los créditos de la cuenta. Mandaria rechaza
              el movimiento si el saldo quedara negativo.
            </p>
          )}
          <ActionForm
            initialDirty
            submitLabel="Aplicar ajuste"
            cancelLabel="Volver"
            onCancel={() => setDraft(null)}
            onSubmit={async () => {
              const movement = await api.adjustment(
                ownerId,
                draft,
                keyFor(draft),
              )
              await refreshCredits(scope, ownerId)
              notify(
                `Ajuste aplicado: ${signedCredits(movement.entry.amount)}.`,
              )
              onClose()
            }}
          >
            {null}
          </ActionForm>
        </>
      ) : (
        <>
          <p className="modal-description">
            Un ajuste corrige la cuenta por una razón administrativa
            excepcional. Para registrar un pago confirmado usa una recarga.
          </p>
          <ActionForm
            initialDirty
            submitLabel="Continuar"
            cancelLabel="Cancelar"
            onCancel={onClose}
            onSubmit={async (data) => {
              const amount = readCredits(data.get('amount'), true)
              setDraft({ amount, reason: readReason(data, true)! })
            }}
          >
            <Field
              label="Créditos del ajuste"
              hint="Positivo suma, negativo resta. No admite cero. Mandaria decide si el saldo lo permite."
            >
              <input
                name="amount"
                type="number"
                min={-MAX_CREDIT_MOVEMENT}
                max={MAX_CREDIT_MOVEMENT}
                step={1}
                required
              />
            </Field>
            {reasonField(true)}
          </ActionForm>
        </>
      )}
    </Modal>
  )
}

/**
 * SUPER_ADMIN credit surface, shared by the provider and the independent driver files. The
 * account and the ledger are read back from the backend after every movement.
 */
export function AdminCreditsPanel({
  scope,
  ownerId,
  ownerName,
  missingDescription,
}: {
  scope: 'provider' | 'independent'
  ownerId: string
  ownerName: string
  missingDescription: string
}) {
  const api =
    scope === 'provider' ? providerCreditsAdmin : independentCreditsAdmin
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<'recharge' | 'adjustment' | null>(null)
  const account = useQuery({
    queryKey: creditKeys.account(scope, ownerId),
    queryFn: ({ signal }) => api.account(ownerId, signal),
  })
  const ledger = useQuery({
    queryKey: creditKeys.ledger(scope, ownerId, { page }),
    queryFn: ({ signal }) =>
      api.ledger(ownerId, { page, pageSize: 20 }, signal),
    enabled: account.isSuccess,
  })
  return (
    <section className="panel" aria-labelledby="credits-panel">
      <div className="panel-toolbar">
        <div>
          <h2 id="credits-panel">Créditos Mandaria</h2>
          <p>Saldo, recargas, cargos por servicio y ajustes</p>
        </div>
        {account.isSuccess && (
          <div className="row-actions">
            <button
              className="button small"
              onClick={() => setDialog('recharge')}
            >
              Registrar recarga
            </button>
            <button
              className="button secondary small"
              onClick={() => setDialog('adjustment')}
            >
              Ajuste administrativo
            </button>
          </div>
        )}
      </div>
      <div className="panel-body">
        {account.isPending ? (
          <Loading />
        ) : account.isError ? (
          <MissingAccount
            error={account.error}
            retry={() => {
              void account.refetch()
            }}
            description={missingDescription}
          />
        ) : (
          <>
            <CreditBalance
              account={account.data}
              note={
                <small>
                  Los créditos son una unidad interna de Mandaria: no son pesos
                  ni sustituyen el cobro del envío.
                </small>
              }
            />
            <p className="panel-note">
              Mandaria no procesa pagos: la recarga registra créditos después de
              confirmar el pago fuera del sistema.
            </p>
            {ledger.isPending ? (
              <Loading />
            ) : ledger.isError ? (
              <ErrorState
                error={ledger.error}
                retry={() => {
                  void ledger.refetch()
                }}
              />
            ) : (
              <>
                <CreditLedger admin items={ledger.data.items} />
                <LedgerPagination
                  page={page}
                  data={ledger.data}
                  onPage={setPage}
                />
              </>
            )}
          </>
        )}
      </div>
      {dialog === 'recharge' && account.isSuccess && (
        <RechargeDialog
          scope={scope}
          ownerId={ownerId}
          ownerName={ownerName}
          api={api}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'adjustment' && account.isSuccess && (
        <AdjustmentDialog
          scope={scope}
          ownerId={ownerId}
          ownerName={ownerName}
          balance={account.data.balance}
          api={api}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  )
}

export function LedgerPagination<T>({
  page,
  data,
  onPage,
}: {
  page: number
  data: Page<T>
  onPage: (page: number) => void
}) {
  if (data.totalPages <= 1) return null
  return (
    <Pagination
      page={page}
      total={data.total}
      totalPages={data.totalPages}
      onPage={onPage}
    />
  )
}
