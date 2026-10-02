import { cloneElement, isValidElement, useId, useState, type ReactElement, type ReactNode } from 'react'
import type { FormStatus } from './useForm'

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  const autoId = useId()
  const id = htmlFor ?? autoId
  let control: ReactNode = children
  if (isValidElement(children) && (children.props as { id?: string }).id === undefined) {
    control = cloneElement(children as ReactElement<{ id?: string }>, { id })
  }
  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {control}
      {hint && <p className="field-hint">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function SaveStatus({ status, message }: { status: FormStatus; message: string | null }) {
  if (status === 'idle' && message === null) return null
  if (status === 'saving') {
    return (
      <span className="save-status save-saving" role="status">
        Saving…
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="save-status save-saved" role="status">
        {message ?? 'Saved.'}
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="save-status save-error" role="alert">
        {message ?? 'Something went wrong.'}
      </span>
    )
  }
  return null
}

export function ConfirmButton({
  label,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  disabled,
  danger = true,
}: {
  label: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  disabled?: boolean
  danger?: boolean
}) {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <button
        type="button"
        className={danger ? 'btn-danger' : 'btn'}
        disabled={disabled}
        onClick={() => setArmed(true)}
      >
        {label}
      </button>
    )
  }
  return (
    <span className="confirm-group">
      <button type="button" className="btn-danger" disabled={disabled} onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button type="button" className="btn" onClick={() => setArmed(false)}>
        {cancelLabel}
      </button>
    </span>
  )
}
