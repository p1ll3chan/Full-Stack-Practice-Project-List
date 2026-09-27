export interface ContentBlockData {
  id: string
  type: 'heading' | 'paragraph' | 'image' | 'list'
  content: string
}

export interface Page {
  id: number
  slug: string
  title: string
  blocks: ContentBlockData[]
  published: boolean
}

export interface Course {
  id: number
  code: string
  title: string
  description: string
  credits: number
  department: string
}

export interface FacultyMember {
  id: number
  name: string
  title: string
  department: string
  email: string
  bio: string
}

export interface ExcellenceItem {
  id: number
  title: string
  category: string
  description: string
  year: number
}
