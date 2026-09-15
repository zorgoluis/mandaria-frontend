import { createRoot } from 'react-dom/client'
import './index.css'
const root = createRoot(document.getElementById('root')!)
void import('./app/Root')
  .then(({ Root }) => root.render(<Root />))
  .catch(() => {
    root.render(
      <div className="state full-state">
        <h1>No fue posible iniciar Mandaria</h1>
        <p>
          Comprueba que VITE_API_URL esté configurada con la URL de Mandaria
          Backend y vuelve a cargar la aplicación.
        </p>
        <button className="button" onClick={() => window.location.reload()}>
          Volver a cargar
        </button>
      </div>,
    )
  })
