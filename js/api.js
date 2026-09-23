/**
 * @file api.js
 * @description REST client communicating with the backend API.
 */

import { config } from './config.js';

async function request(endpoint, options = {}) {
  const apiBase = config.getApiBaseUrl() || '/api';
  const url = `${apiBase}${endpoint}`;
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem('sessional_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchConfig = {
    ...options,
    headers
  };

  const response = await fetch(url, fetchConfig);

  // Handle file downloads (Excel, DOCX)
  const contentType = response.headers.get('content-type') || '';
  if (
    contentType.includes('spreadsheetml') ||
    contentType.includes('wordprocessingml') ||
    contentType.includes('octet-stream')
  ) {
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    let fileName = 'download';
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      fileName = match[1];
    }
    return { blob, fileName };
  }

  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const rawText = await response.text();
    if (!response.ok) {
      throw new Error(`API error (${response.status}): ${rawText.slice(0, 120)}`);
    }
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Server returned non-JSON response (${response.status}). Ensure backend API is deployed.`);
    }
  }

  if (!response.ok) {
    const errorMsg = data.error?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.details = data.error?.details;
    err.code = data.error?.code;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getProfile: () => request('/auth/me'),

  // Subjects
  getSubjects: () => request('/subjects'),
  getSubject: (id) => request(`/subjects/${id}`),
  createSubject: (data) => request('/subjects', { method: 'POST', body: JSON.stringify(data) }),
  deleteSubject: (id) => request(`/subjects/${id}`, { method: 'DELETE' }),

  // Sessions
  getSessions: () => request('/sessions'),
  getSession: (id) => request(`/sessions/${id}`),
  createSession: (data) => request('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (id, data) => request(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
  getSessionResources: (id) => request(`/sessions/${id}/resources`),
  addSessionResource: (id, data) => request(`/sessions/${id}/resources`, { method: 'POST', body: JSON.stringify(data) }),
  deleteSessionResource: (id, resourceId) => request(`/sessions/${id}/resources/${resourceId}`, { method: 'DELETE' }),

  // Students
  getStudents: (sessionId) => request(`/students/session/${sessionId}`),
  addStudent: (sessionId, data) => request(`/students/session/${sessionId}`, { method: 'POST', body: JSON.stringify(data) }),
  deleteStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),
  bulkDeleteStudents: (ids) => request('/students/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),

  // Marks
  getMarks: (sessionId) => request(`/marks/session/${sessionId}`),
  saveBatchMarks: (sessionId, updates) => request(`/marks/batch/${sessionId}`, { method: 'POST', body: JSON.stringify({ updates }) }),
  uploadMarksFile: (sessionId, formData, commit = false) =>
    request(`/marks/upload/${sessionId}?commit=${commit}`, {
      method: 'POST',
      body: formData
    }),

  // Results & Stats
  getResults: (sessionId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/results/${sessionId}${query ? `?${query}` : ''}`);
  },
  recomputeResults: (sessionId) => request(`/results/compute/${sessionId}`, { method: 'POST' }),
  getStats: (sessionId) => request(`/results/${sessionId}/stats`),

  // Letters
  getLetterPreview: (sessionId, type = 'FAST') => request(`/letters/${sessionId}/preview?type=${type}`),
  downloadLetterDocx: async (sessionId, type = 'FAST') => {
    const { blob, fileName } = await request(`/letters/${sessionId}/download?type=${type}`);
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // Reports
  downloadExcelReport: async (sessionId) => {
    const { blob, fileName } = await request(`/reports/${sessionId}/excel`);
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
  getReportsSummary: (sessionId) => request(`/reports/${sessionId}/summary`)
};
