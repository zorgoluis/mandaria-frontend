import { useState } from 'react'
import { PageTitle } from '../components/ui'
import {
  InvitationsPanel,
  InviteButton,
  InviteProviderAdminDialog,
} from './components'

/** SUPER_ADMIN: every invitation of every provider. PROVIDER_ADMIN manages drivers in Repartidores. */
export function InvitationsPage() {
  const [inviting, setInviting] = useState(false)
  return (
    <>
      <PageTitle
        title="Invitaciones"
        description="Incorpora administradores y repartidores sin crear cuentas desde el servidor."
        action={
          <InviteButton
            label="Invitar administrador"
            onClick={() => setInviting(true)}
          />
        }
      />
      <InvitationsPanel
        scope={{ kind: 'admin' }}
        title="Todas las invitaciones"
        description="Para invitar repartidores, abre Repartidores y selecciona el proveedor."
        roleFilter
      />
      {inviting && (
        <InviteProviderAdminDialog onClose={() => setInviting(false)} />
      )}
    </>
  )
}
