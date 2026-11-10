import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smart_att_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor: check 401
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized and not already on login, redirect
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('smart_att_token');
        localStorage.removeItem('smart_att_user');
      }
    }
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email })
};

export const departmentAPI = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`)
};

export const academicYearAPI = {
  getAll: (deptId) => api.get('/academic-years', { params: { departmentId: deptId } }),
  create: (data) => api.post('/academic-years', data),
  update: (id, data) => api.put(`/academic-years/${id}`, data),
  delete: (id) => api.delete(`/academic-years/${id}`)
};

export const divisionAPI = {
  getAll: (params) => api.get('/divisions', { params }),
  getDetails: (id) => api.get(`/divisions/${id}`),
  create: (data) => api.post('/divisions', data),
  update: (id, data) => api.put(`/divisions/${id}`, data),
  delete: (id) => api.delete(`/divisions/${id}`)
};

export const studentAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`)
};

export const teacherAPI = {
  getAll: (params) => api.get('/teachers', { params }),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`)
};

export const rfidAPI = {
  getAll: (params) => api.get('/rfid', { params }),
  register: (data) => api.post('/rfid/register', data),
  assign: (id, studentId) => api.put(`/rfid/${id}/assign`, { studentId }),
  updateStatus: (id, data) => api.put(`/rfid/${id}/status`, data),
  checkStatus: (uid) => api.get(`/rfid/status/${uid}`),
  getLatestUnknown: () => api.get('/rfid/latest-unknown')
};

export const attendanceAPI = {
  scan: (data) => api.post('/attendance/scan', data),
  getRecords: (params) => api.get('/attendance', { params }),
  getStudentAttendance: (studentId) => api.get(`/attendance/student/${studentId}`),
  getSubjectStats: (params) => api.get('/attendance/subject-stats', { params }),
  getDashboardSummary: () => api.get('/attendance/dashboard-summary'),
  updateStatus: (id, data) => api.put(`/attendance/${id}`, data),
  finalize: (data) => api.post('/attendance/finalize', data)
};

export const timetableAPI = {
  getAll: (params) => api.get('/timetable', { params }),
  create: (data) => api.post('/timetable', data),
  update: (id, data) => api.put(`/timetable/${id}`, data),
  delete: (id) => api.delete(`/timetable/${id}`)
};

export const marksAPI = {
  getAll: (params) => api.get('/marks', { params }),
  getStudentMarks: (studentId) => api.get(`/marks/student/${studentId}`),
  save: (data) => api.post('/marks', data)
};

export const deviceAPI = {
  getAll: () => api.get('/devices'),
  register: (data) => api.post('/devices', data),
  update: (id, data) => api.put(`/devices/${id}`, data),
  delete: (id) => api.delete(`/devices/${id}`),
  rotateToken: (id) => api.post(`/devices/${id}/rotate-token`),
  getLogs: (id) => api.get(`/devices/${id}/logs`),
  simulateScan: (data) => api.post('/devices/simulate-scan', data)
};

export const reportsAPI = {
  getAnalytics: (params) => api.get('/reports/analytics', { params }),
  getData: (params) => api.get('/reports/export', { params })
};

export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  create: (data) => api.post('/notifications', data)
};

export const auditAPI = {
  getAll: () => api.get('/audit-logs')
};

export const subjectsAPI = {
  getAll: (params) => api.get('/subjects', { params }),
  create: (data) => api.post('/subjects', data),
  delete: (id) => api.delete(`/subjects/${id}`)
};

export default api;
