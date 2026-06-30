import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getCandidates = (params?: any) => api.get('/candidates', { params })
export const getCandidate = (id: string) => api.get(`/candidates/${id}`)
export const deleteCandidate = (id: string) => api.delete(`/candidates/${id}`)
export const getStats = () => api.get('/candidates/stats')
export const getAllJobs = () => api.get('/pipeline')
export const getPipelineJob = (jobId: string) => api.get(`/pipeline/${jobId}`)
export const getUploadHistory = () => api.get('/upload/history')
export const uploadPdf = (file: File) => {
  const fd = new FormData(); fd.append('file', file)
  return api.post('/upload/pdf', fd)
}
export const uploadMultiplePdfs = (files: File[]) => {
  const fd = new FormData(); files.forEach(f => fd.append('files', f))
  return api.post('/upload/pdfs', fd)
}
export const uploadCsv = (file: File) => {
  const fd = new FormData(); fd.append('file', file)
  return api.post('/upload/csv', fd)
}
export const uploadUrl = (url: string) => api.post('/upload/url', { url })
export const getConfig = () => api.get('/config')
export const saveConfig = (config: any) => api.post('/config', config)
export const generateOutput = (candidateId: string, config?: any) =>
  api.post(`/output/${candidateId}`, config)
export const downloadReport = (format: 'json' | 'csv' | 'pdf') =>
  api.get(`/reports/${format}`, { responseType: 'blob' })
export const downloadCandidateJson = (candidateId: string, config?: any) =>
  api.post(`/candidates/${candidateId}/output/json`, config ?? {}, { responseType: 'blob' })

export default api
