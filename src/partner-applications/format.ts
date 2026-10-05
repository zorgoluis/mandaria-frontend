import type {
  PartnerApplicationStatus,
  PartnerApplicationType,
  PartnerVehicleType,
} from './types'

export const partnerStatusLabels: Record<PartnerApplicationStatus, string> = {
  RECEIVED: 'Recibida',
  CONTACTED: 'Contactada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  DISCARDED: 'Descartada',
}
export const partnerStatusHints: Record<PartnerApplicationStatus, string> = {
  RECEIVED: 'Llegó desde la landing; nadie la ha atendido todavía.',
  CONTACTED: 'Operación ya habló con la persona.',
  APPROVED:
    'Aceptada. Da de alta a la persona con los flujos existentes y registra los vínculos.',
  REJECTED: 'No procede. Es un estado final.',
  DISCARDED: 'Spam, prueba o duplicado manual. Es un estado final.',
}
/** Button label for each target status. */
export const partnerActionLabels: Record<PartnerApplicationStatus, string> = {
  RECEIVED: 'Marcar como recibida',
  CONTACTED: 'Marcar como contactada',
  APPROVED: 'Aprobar',
  REJECTED: 'Rechazar',
  DISCARDED: 'Descartar',
}
export const partnerTypeLabels: Record<PartnerApplicationType, string> = {
  INDIVIDUAL: 'Individual',
  FLEET: 'Flotilla',
}
/** The landing's own chip names, not the generic vehicle labels of the catalog. */
export const partnerVehicleLabels: Record<PartnerVehicleType, string> = {
  BICYCLE: 'Bicicleta',
  MOTORCYCLE: 'Moto',
  CAR: 'Auto',
  PICKUP: 'Camioneta',
  TRUCK: 'Camión',
}
/** Phones arrive as exactly 10 Mexican digits; WhatsApp needs the 52 country code. */
export const whatsappUrl = (phone: string) =>
  `https://wa.me/52${phone.replace(/\D/g, '')}`
export const phoneLabel = (phone: string) =>
  /^\d{10}$/.test(phone)
    ? `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`
    : phone
