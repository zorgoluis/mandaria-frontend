import { useEffect, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { validateFile } from './service'
import type { Requirements } from './types'

export function EvidencePicker({
  requirements,
  busy,
  onValid,
}: {
  requirements: Requirements
  busy: boolean
  onValid: (valid: boolean) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const preview = useRef<HTMLImageElement>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!file) return
    const next = URL.createObjectURL(file)
    if (preview.current) preview.current.src = next
    return () => URL.revokeObjectURL(next)
  }, [file])
  const choose = (next: File | null) => {
    setError('')
    setFile(null)
    onValid(false)
    if (!next) return
    try {
      validateFile(next, requirements)
      setFile(next)
      onValid(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Imagen no válida.')
    }
  }
  return (
    <div className="identity-picker" aria-live="polite">
      <label
        className="identity-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          if (busy || !input.current) return
          const transfer = new DataTransfer()
          if (e.dataTransfer.files[0])
            transfer.items.add(e.dataTransfer.files[0])
          input.current.files = transfer.files
          input.current.dispatchEvent(new Event('change', { bubbles: true }))
        }}
      >
        <Upload aria-hidden="true" />
        <strong>Arrastra la imagen o elige un archivo</strong>
        <span>
          Imagen <span aria-hidden="true">*</span>
        </span>
        <input
          ref={input}
          name="file"
          type="file"
          accept="image/jpeg,image/png"
          required
          disabled={busy}
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
        />
        {!file && <span>No se eligió ningún archivo</span>}
      </label>
      {file && (
        <div className="identity-selected">
          <img ref={preview} alt="Vista previa de la imagen seleccionada" />
          <span>
            {file.name} · {(file.size / 1024).toFixed(1)} KB
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (input.current) input.current.value = ''
              choose(null)
            }}
          >
            Quitar
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {busy && (
        <div
          className="identity-progress"
          role="progressbar"
          aria-label="Carga de imagen en curso"
        >
          <span />
        </div>
      )}
    </div>
  )
}
