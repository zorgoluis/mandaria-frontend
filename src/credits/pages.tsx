import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { ErrorState, Loading, PageTitle } from '../components/ui'
import { ProviderScope } from '../logistics/components'
import type { ProviderContext } from '../logistics/types'
import { PortalTabs } from '../driver-portal/pages'
import {
  CreditBalance,
  CreditLedger,
  LedgerPagination,
  MissingAccount,
} from './components'
import { myDriverCredits, myProviderCredits } from './service'
import { creditKeys } from './queries'

const PAGE_SIZE = 20
const readOnlyNote =
  'Las recargas y los ajustes los registra Mandaria. Para sumar créditos, contacta a Mandaria por los medios administrativos acordados.'

/** PROVIDER_ADMIN: my provider's account, read only. The provider comes from my memberships. */
export function MyCreditsPage() {
  return (
    <>
      <PageTitle
        title="Créditos"
        description="Saldo e historial de créditos de mi proveedor"
      />
      <ProviderScope>
        {(scope) => <ProviderCredits key={scope.providerId} scope={scope} />}
      </ProviderScope>
    </>
  )
}
function ProviderCredits({ scope }: { scope: ProviderContext }) {
  const [page, setPage] = useState(1)
  const account = useQuery({
    queryKey: creditKeys.account('my-provider', scope.providerId),
    queryFn: ({ signal }) =>
      myProviderCredits.account(scope.providerId, signal),
  })
  const ledger = useQuery({
    queryKey: creditKeys.ledger('my-provider', scope.providerId, { page }),
    queryFn: ({ signal }) =>
      myProviderCredits.ledger(
        scope.providerId,
        { page, pageSize: PAGE_SIZE },
        signal,
      ),
    enabled: account.isSuccess,
  })
  return (
    <section className="panel" aria-labelledby="my-credits">
      <div className="panel-toolbar">
        <div>
          <h2 id="my-credits">Créditos de {scope.name}</h2>
          <p>Un solo saldo para el proveedor y sus repartidores de flotilla</p>
        </div>
        <button
          className="button secondary small"
          onClick={() => {
            void account.refetch()
            void ledger.refetch()
          }}
          disabled={account.isFetching || ledger.isFetching}
        >
          <RefreshCw size={14} className={account.isFetching ? 'spin' : ''} />
          Actualizar
        </button>
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
            description="Tu proveedor todavía no tiene cuenta de créditos en Mandaria. Contacta a Mandaria para activarla."
          />
        ) : (
          <>
            <CreditBalance account={account.data} />
            <p className="panel-note">{readOnlyNote}</p>
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
                <CreditLedger items={ledger.data.items} />
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
    </section>
  )
}

/** DRIVER: my own account as an independent driver. The session decides which account it is. */
export function DriverCreditsPage() {
  const [page, setPage] = useState(1)
  const account = useQuery({
    queryKey: creditKeys.account('driver', 'me'),
    queryFn: ({ signal }) => myDriverCredits.account(signal),
  })
  const ledger = useQuery({
    queryKey: creditKeys.ledger('driver', 'me', { page }),
    queryFn: ({ signal }) =>
      myDriverCredits.ledger({ page, pageSize: PAGE_SIZE }, signal),
    enabled: account.isSuccess,
  })
  return (
    <>
      <PageTitle
        title="Créditos"
        description="Mi saldo como repartidor independiente"
      />
      <PortalTabs />
      <section className="panel" aria-labelledby="driver-credits">
        <div className="panel-toolbar">
          <div>
            <h2 id="driver-credits">Mis créditos</h2>
            <p>Saldo e historial de mis movimientos</p>
          </div>
          <button
            className="button secondary small"
            onClick={() => {
              void account.refetch()
              void ledger.refetch()
            }}
            disabled={account.isFetching || ledger.isFetching}
          >
            <RefreshCw size={14} className={account.isFetching ? 'spin' : ''} />
            Actualizar
          </button>
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
              description="Sólo los repartidores independientes aprobados tienen cuenta propia de créditos. Si repartes para un proveedor, los servicios se pagan con la cuenta de tu proveedor."
            />
          ) : (
            <>
              <CreditBalance account={account.data} />
              <p className="panel-note">{readOnlyNote}</p>
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
                  <CreditLedger items={ledger.data.items} />
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
      </section>
    </>
  )
}
