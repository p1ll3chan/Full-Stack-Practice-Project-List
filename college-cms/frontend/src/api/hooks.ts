import { useApi, useApiList } from '../hooks/useApi'
import type {
  AcademicDetails,
  CollegeContact,
  Course,
  DegreeLevel,
  ExcellenceDomain,
  ExcellenceItem,
  FacultyMember,
  ListMeta,
  PageWithBlocks,
  Stream,
  StreamWithLevels,
} from './types'
import { queryKeys, type ListParams } from './queryKeys'

export function usePageBySlug(slug: string) {
  return useApi<PageWithBlocks>(queryKeys.pageBySlug(slug))
}

export function useStreamList(params: ListParams & { category?: string } = {}) {
  return useApiList<Stream>(queryKeys.streams(params))
}

export function useAllStreams() {
  return useApiList<Stream>(queryKeys.streams({ limit: 100, sort: 'sortOrder' }))
}

export function useStreamBySlug(slug: string) {
  return useApi<StreamWithLevels>(queryKeys.streamBySlug(slug))
}

export function useDegreeLevelList(params: ListParams = {}) {
  return useApiList<DegreeLevel>(queryKeys.degreeLevels(params))
}

export function useCourseList(params: ListParams & { stream?: string; degreeLevelId?: number } = {}) {
  return useApiList<Course>(queryKeys.courses(params))
}

export function useCourseById(id: string | undefined) {
  return useApi<Course>(queryKeys.courseById(id ?? ''))
}

export function useAcademicDetails(streamSlug: string) {
  return useApi<AcademicDetails>(queryKeys.academicDetails(streamSlug))
}

export function useFacultyList(params: ListParams & { stream?: string } = {}) {
  return useApiList<FacultyMember>(queryKeys.faculty(params))
}

export function useFacultyById(id: string | undefined) {
  return useApi<FacultyMember>(queryKeys.facultyById(id ?? ''))
}

export function useExcellenceList(params: ListParams & { domain?: string } = {}) {
  return useApiList<ExcellenceItem>(queryKeys.excellence(params))
}

export function useExcellenceDomains(params: ListParams = {}) {
  return useApiList<ExcellenceDomain>(queryKeys.excellenceDomains(params))
}

export function useExcellenceDomain(slug: string) {
  return useApi<ExcellenceDomain>(queryKeys.excellenceDomainBySlug(slug))
}

export function useContact() {
  return useApi<CollegeContact>(queryKeys.contact())
}

export type { ListMeta }
