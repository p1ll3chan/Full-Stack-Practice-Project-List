import { useEffect, useRef, useState } from 'react'
import type { z } from 'zod'
import { ApiError } from '../api/client'
import { detailsToErrors, issuesToErrors } from './schemas'

export type FormStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface FormApi<V> {
  values: V
  errors: Record<string, string>
  status: FormStatus
  message: string | null
  saving: boolean
  setField: <K extends keyof V>(name: K, value: V[K]) => void
  setValues: (next: V) => void
  setErrors: (next: Record<string, string>) => void
  reset: (next?: V) => void
  submit: (event?: { preventDefault(): void }) => Promise<void>
}

interface UseFormConfig<V> {
  initial: V
  schema: z.ZodType<V>
  partial?: boolean
  onSubmit: (values: V, patch: Partial<V>) => Promise<void>
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

export function useForm<V extends Record<string, unknown>>(config: UseFormConfig<V>): FormApi<V> {
  const [values, setValuesState] = useState<V>(config.initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<FormStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const initialRef = useRef(config.initial)
  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  }, [config])

  const setField = <K extends keyof V>(name: K, value: V[K]) => {
    setValuesState((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      if (!(String(name) in current)) return current
      const next = { ...current }
      delete next[String(name)]
      return next
    })
    setStatus((current) => (current === 'saved' || current === 'error' ? 'idle' : current))
    setMessage((current) => (status === 'saved' || status === 'error' ? null : current))
  }

  const setValues = (next: V) => {
    setValuesState(next)
    setErrors({})
    setStatus('idle')
    setMessage(null)
  }

  const reset = (next?: V) => {
    const seed = next ?? initialRef.current
    initialRef.current = seed
    setValuesState(seed)
    setErrors({})
    setStatus('idle')
    setMessage(null)
  }

  const submit = async (event?: { preventDefault(): void }) => {
    event?.preventDefault()
    const active = configRef.current
    const parsed = active.schema.safeParse(values)
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error))
      setStatus('error')
      setMessage('Fix the highlighted fields before saving.')
      return
    }
    const data = parsed.data as V
    let patch: Partial<V> = data
    if (active.partial) {
      const dirty: Record<string, unknown> = {}
      for (const key of Object.keys(data)) {
        if (!sameValue(data[key as keyof V], initialRef.current[key as keyof V])) dirty[key] = data[key as keyof V]
      }
      if (Object.keys(dirty).length === 0) {
        setErrors({})
        setStatus('saved')
        setMessage('No changes to save.')
        return
      }
      patch = dirty as Partial<V>
    }
    setErrors({})
    setStatus('saving')
    setMessage(null)
    try {
      await active.onSubmit(data, patch)
      initialRef.current = data
      setStatus('saved')
      setMessage('Saved.')
    } catch (error) {
      setStatus('error')
      if (error instanceof ApiError) {
        if (error.details && error.details.length > 0) setErrors(detailsToErrors(error.details))
        setMessage(error.message)
      } else if (error instanceof Error) {
        setMessage(error.message)
      } else {
        setMessage('Save failed.')
      }
    }
  }

  return {
    values,
    errors,
    status,
    message,
    saving: status === 'saving',
    setField,
    setValues,
    setErrors,
    reset,
    submit,
  }
}
