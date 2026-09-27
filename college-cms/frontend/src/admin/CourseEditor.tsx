import { useState } from 'react'
import { api } from '../api/client'
import type { Course } from '../api/types'

export default function CourseEditor({ course }: { course?: Course }) {
  const [form, setForm] = useState({
    code: course?.code ?? '',
    title: course?.title ?? '',
    description: course?.description ?? '',
    credits: course?.credits ?? 3,
    department: course?.department ?? '',
  })
  const [status, setStatus] = useState<string | null>(null)

  const set = (key: keyof typeof form, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    setStatus('Saving...')
    try {
      if (course) {
        await api.put<Course>(`/academics/courses/${course.id}`, form)
      } else {
        await api.post<Course>('/academics/courses', form)
      }
      setStatus('Saved.')
    } catch (err) {
      setStatus(`Save failed: ${(err as Error).message}`)
    }
  }

  return (
    <section>
      <h1>{course ? 'Edit Course' : 'New Course'}</h1>
      <label>
        Code
        <input value={form.code} onChange={(e) => set('code', e.target.value)} />
      </label>
      <label>
        Title
        <input value={form.title} onChange={(e) => set('title', e.target.value)} />
      </label>
      <label>
        Department
        <input value={form.department} onChange={(e) => set('department', e.target.value)} />
      </label>
      <label>
        Credits
        <input
          type="number"
          min={1}
          max={10}
          value={form.credits}
          onChange={(e) => set('credits', Number(e.target.value))}
        />
      </label>
      <label>
        Description
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </label>
      <div className="editor-actions">
        <button type="button" className="btn-primary" onClick={save}>
          Save Course
        </button>
        {status && <span className="editor-status">{status}</span>}
      </div>
    </section>
  )
}
