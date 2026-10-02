import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { z } from 'zod'
import { api } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { CollegeContact } from '../api/types'
import { ErrorState, Loading } from '../components/states'
import { FormField, SaveStatus } from './form'
import { useForm } from './useForm'
import { contactUpsertSchema } from './schemas'

type ContactFormValues = {
  collegeName: string
  tagline: string
  address: string
  phone: string
  email: string
  officeHours: string
  mapEmbedUrl: string
}

export default function ContactEditor() {
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.contact(),
    queryFn: () => api.get<CollegeContact>('/admin/contact'),
  })

  if (isLoading) return <Loading label="Loading contact details…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!data) return <ErrorState error={new Error('Contact details not loaded.')} onRetry={refetch} />

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>Contact details</h1>
        <Link to="/admin" className="btn">
          Dashboard
        </Link>
      </div>
      <ContactForm
        contact={data}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: adminKeys.contact() })
        }}
      />
    </section>
  )
}

function ContactForm({ contact, onSaved }: { contact: CollegeContact; onSaved: () => void }) {
  const form = useForm<ContactFormValues>({
    initial: {
      collegeName: contact.collegeName,
      tagline: contact.tagline,
      address: contact.address,
      phone: contact.phone,
      email: contact.email,
      officeHours: contact.officeHours,
      mapEmbedUrl: contact.mapEmbedUrl,
    },
    schema: contactUpsertSchema as unknown as z.ZodType<ContactFormValues>,
    partial: true,
    onSubmit: async (_values, patch) => {
      await api.put('/admin/contact', patch)
      onSaved()
    },
  })

  return (
    <div className="admin-card">
      <form
        className="admin-form"
        onSubmit={(event) => {
          void form.submit(event)
        }}
      >
        <FormField label="College name" error={form.errors.collegeName}>
          <input
            value={form.values.collegeName}
            onChange={(event) => form.setField('collegeName', event.target.value)}
          />
        </FormField>
        <FormField label="Tagline" error={form.errors.tagline}>
          <input value={form.values.tagline} onChange={(event) => form.setField('tagline', event.target.value)} />
        </FormField>
        <FormField label="Address" error={form.errors.address}>
          <textarea
            rows={3}
            value={form.values.address}
            onChange={(event) => form.setField('address', event.target.value)}
          />
        </FormField>
        <div className="form-grid">
          <FormField label="Phone" error={form.errors.phone}>
            <input value={form.values.phone} onChange={(event) => form.setField('phone', event.target.value)} />
          </FormField>
          <FormField label="Email" error={form.errors.email}>
            <input
              type="email"
              value={form.values.email}
              onChange={(event) => form.setField('email', event.target.value)}
            />
          </FormField>
        </div>
        <div className="form-grid">
          <FormField label="Office hours" error={form.errors.officeHours}>
            <input
              value={form.values.officeHours}
              onChange={(event) => form.setField('officeHours', event.target.value)}
            />
          </FormField>
          <FormField label="Map embed URL" error={form.errors.mapEmbedUrl}>
            <input
              value={form.values.mapEmbedUrl}
              onChange={(event) => form.setField('mapEmbedUrl', event.target.value)}
            />
          </FormField>
        </div>
        <SaveStatus status={form.status} message={form.message} />
        <div className="editor-actions">
          <button type="submit" className="btn-primary" disabled={form.saving}>
            {form.saving ? 'Saving…' : 'Save contact details'}
          </button>
        </div>
      </form>
    </div>
  )
}
