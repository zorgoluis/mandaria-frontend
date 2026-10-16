import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useId,
  type ReactNode,
  type ComponentProps,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost'
type ButtonAppearance = {
  variant?: Variant
  loading?: boolean
  loadingLabel?: string
  arrow?: boolean
}
function appearance(variant: Variant, className = '') {
  const resolved = /\b(icon-button|text-button)\b/.test(className)
    ? 'ghost'
    : /\bsecondary\b/.test(className)
      ? 'secondary'
      : variant
  return { resolved, className: `button ui-button ${resolved} ${className}` }
}
export function Button({
  variant = 'primary',
  loading = false,
  loadingLabel,
  arrow,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ComponentProps<'button'> & ButtonAppearance) {
  const style = appearance(variant, className)
  return (
    <button
      {...props}
      type={type}
      className={style.className}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <LoaderCircle className="ui-icon spin" aria-hidden="true" />}
      {loading && loadingLabel ? loadingLabel : children}
      {(arrow ?? style.resolved === 'primary') && (
        <span className="button-arrow" aria-hidden="true">
          →
        </span>
      )}
    </button>
  )
}
export function ButtonLink({
  variant = 'primary',
  arrow,
  className,
  children,
  ...props
}: LinkProps & Pick<ButtonAppearance, 'variant' | 'arrow'>) {
  const style = appearance(variant, className)
  return (
    <Link {...props} className={style.className}>
      {children}
      {(arrow ?? style.resolved === 'primary') && (
        <span className="button-arrow" aria-hidden="true">
          →
        </span>
      )}
    </Link>
  )
}

type FieldMeta = { labelId: string; description: string; invalid: boolean }
const FieldContext = createContext<FieldMeta | null>(null)
type FieldProps = {
  label: ReactNode
  children: ReactNode
  hint?: ReactNode
  help?: ReactNode
  error?: ReactNode
  className?: string
}
export function Field({
  label,
  children,
  hint,
  help = hint,
  error,
  className = '',
}: FieldProps) {
  const id = useId()
  const meta = {
    labelId: `${id}-label`,
    description: [help && `${id}-help`, error && `${id}-error`]
      .filter(Boolean)
      .join(' '),
    invalid: !!error,
  }
  // Native children remain supported for external callers; shared controls also
  // consume context through nested wrappers (e.g. the password visibility control).
  const connect = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (child) => {
      if (
        !isValidElement<ComponentProps<'input'> & { children?: ReactNode }>(
          child,
        ) ||
        typeof child.type !== 'string'
      )
        return child
      if (['input', 'select', 'textarea'].includes(child.type))
        return cloneElement(child, {
          'aria-labelledby':
            child.props['aria-labelledby'] ??
            (child.props['aria-label'] ? undefined : meta.labelId),
          'aria-describedby':
            [child.props['aria-describedby'], meta.description]
              .filter(Boolean)
              .join(' ') || undefined,
          'aria-invalid': meta.invalid || child.props['aria-invalid'],
        })
      return child.props.children
        ? cloneElement(child, {}, connect(child.props.children))
        : child
    })
  return (
    <FieldContext.Provider value={meta}>
      <label
        className={`field ui-field ${error ? 'has-error' : ''} ${className}`}
      >
        <span id={meta.labelId} className="field-label">
          {label}
        </span>
        {connect(children)}
        {help && (
          <small id={`${id}-help`} className="field-help">
            {help}
          </small>
        )}
        {error && (
          <small id={`${id}-error`} className="field-error" role="alert">
            {error}
          </small>
        )}
      </label>
    </FieldContext.Provider>
  )
}
type ControlExtras = { label?: ReactNode; help?: ReactNode; error?: ReactNode }
function useControl(props: {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: ComponentProps<'input'>['aria-invalid']
}) {
  const field = useContext(FieldContext)
  return {
    'aria-labelledby':
      props['aria-labelledby'] ??
      (props['aria-label'] ? undefined : field?.labelId),
    'aria-describedby':
      [
        ...new Set(
          [props['aria-describedby'], field?.description].filter(Boolean),
        ),
      ].join(' ') || undefined,
    'aria-invalid': field?.invalid || props['aria-invalid'],
  }
}
export function Input({
  label,
  help,
  error,
  className = '',
  ...props
}: ComponentProps<'input'> & ControlExtras) {
  const accessible = useControl(props)
  if (label !== undefined || help || error)
    return (
      <Field label={label} help={help} error={error}>
        <Input {...props} className={className} />
      </Field>
    )
  return (
    <input {...props} {...accessible} className={`ui-input ${className}`} />
  )
}
export function Select({
  label,
  help,
  error,
  className = '',
  ...props
}: ComponentProps<'select'> & ControlExtras) {
  const accessible = useControl(props)
  if (label !== undefined || help || error)
    return (
      <Field label={label} help={help} error={error}>
        <Select {...props} className={className} />
      </Field>
    )
  return (
    <select {...props} {...accessible} className={`ui-select ${className}`} />
  )
}
export function Textarea({
  label,
  help,
  error,
  className = '',
  ...props
}: ComponentProps<'textarea'> & ControlExtras) {
  const accessible = useControl(props)
  if (label !== undefined || help || error)
    return (
      <Field label={label} help={help} error={error}>
        <Textarea {...props} className={className} />
      </Field>
    )
  return (
    <textarea
      {...props}
      {...accessible}
      className={`ui-textarea ${className}`}
    />
  )
}
export function Checkbox({
  label,
  help,
  error,
  className = '',
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & ControlExtras) {
  const accessible = useControl(props)
  if (label !== undefined || help || error)
    return (
      <Field label={label} help={help} error={error} className="checkbox-field">
        <Checkbox {...props} className={className} />
      </Field>
    )
  return (
    <input
      {...props}
      {...accessible}
      type="checkbox"
      className={`ui-checkbox ${className}`}
    />
  )
}
