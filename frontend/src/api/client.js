import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Resume
export const uploadResume = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/resume/upload', fd)
}
export const getResume = () => api.get('/resume/')
export const deleteResume = () => api.delete('/resume/')

// Listings
export const searchListings = (params) => api.get('/listings/search', { params })
export const getAllScholarships = () => api.get('/listings/scholarships')

// AI
export const generateCoverLetter = (data) => api.post('/ai/cover-letter', data)
export const generateFormData = (data) => api.post('/ai/form-fill', data)

// Pending fill for browser extension
export const setPendingFill = (data) => api.post('/pending-fill', data)
export const clearPendingFill = () => api.delete('/pending-fill')

// Applications
export const saveApplication = (data) => api.post('/applications/', data)
export const getApplications = () => api.get('/applications/')
export const getStats = () => api.get('/applications/stats')
export const updateApplication = (id, data) => api.patch(`/applications/${id}`, data)
export const deleteApplication = (id) => api.delete(`/applications/${id}`)
