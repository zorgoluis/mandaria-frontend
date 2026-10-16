import { Truck } from 'lucide-react'
import type { ReactNode } from 'react'

export type RouteStep = {
  id: string
  label: ReactNode
  description?: ReactNode
  state?: 'pending' | 'current' | 'complete' | 'blocked'
}
/** States are supplied by the domain, never inferred from elapsed time or money. */
export function RouteProgress({
  steps,
  label = 'Progreso del servicio',
  className = '',
}: {
  steps: RouteStep[]
  label?: string
  className?: string
}) {
  if (!steps.length) return null
  return (
    <ol className={`route-progress ${className}`} aria-label={label}>
      {steps.map((step, index) => (
        <li
          key={step.id}
          data-state={step.state ?? 'pending'}
          aria-current={step.state === 'current' ? 'step' : undefined}
        >
          <span className="route-progress-track" aria-hidden="true">
            <span
              className={`route-progress-point ${index === steps.length - 1 ? 'destination' : ''}`}
            />
            {step.state === 'current' && (
              <Truck className="route-progress-vehicle" />
            )}
          </span>
          <div className="route-progress-content">
            <strong>{step.label}</strong>
            <span className="route-progress-status">
              {step.state === 'current'
                ? 'Paso actual'
                : step.state === 'complete'
                  ? 'Completado'
                  : step.state === 'blocked'
                    ? 'Detenido'
                    : 'Pendiente'}
            </span>
            {step.description && (
              <div className="route-progress-description">
                {step.description}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
