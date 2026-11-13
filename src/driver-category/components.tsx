import { categoryBlock, validCategory, type DriverCategory } from './contract'
export function CategorySummary({ value }: { value?: DriverCategory }) {
  return (
    <section className="panel panel-body" aria-label="Categoría vigente">
      <h2>Categoría vigente</h2>
      {validCategory(value) ? (
        <>
          <p>
            {value.category} · Revisión {value.categoryRevision}
          </p>
          <p>
            Pertenencia independiente:{' '}
            {value.independentMembershipState ?? 'Sin perfil'}. Aprobación:{' '}
            {value.independentApprovalStatus ?? 'No disponible'}.
          </p>
          <p>
            {categoryBlock(value) ??
              'Independiente vigente. Zonas, requisitos y recepción se verifican por separado.'}
          </p>
          {value.category === 'INDEPENDENT' && (
            <p>
              La transición de independiente a flotilla está bloqueada por
              decisión de negocio. Suspender o rechazar no habilita esa
              transición.
            </p>
          )}
        </>
      ) : (
        <p>{categoryBlock(value)}</p>
      )}
    </section>
  )
}
