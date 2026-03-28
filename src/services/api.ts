import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';
const API = axios.create({ baseURL });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (data: any) => {
    const form = new URLSearchParams();
    form.append('username', data.email);
    form.append('password', data.password);
    return API.post('/auth/login', form);
  },
  register: (data: any) => API.post('/auth/register', data),
};

export const courses = {
  list: () => API.get('/courses'),
  create: (data: any) => API.post('/courses', data),
  update: (id: number, data: any) => API.put(`/courses/${id}`, data),
  delete: (id: number) => API.delete(`/courses/${id}`),
};

export const attendance = {
  createSession: (data: any) => API.post('/attendance/sessions', data),
  getQR: (id: number, origin: string) => API.get(`/attendance/sessions/${id}/qr?origin=${encodeURIComponent(origin)}`),
  endSession: (id: number) => API.post(`/attendance/sessions/${id}/end`),
  clearAttendance: (id: number) => API.post(`/attendance/sessions/${id}/clear`),
  getRecords: (id: number) => API.get(`/attendance/sessions/${id}/records`),
  getLocations: (id: number) => API.get(`/attendance/sessions/${id}/locations`),
  setLocation: (id: number, lat: number, lng: number) => API.post(`/attendance/sessions/${id}/set-location`, { latitude: lat, longitude: lng }),
  scan: (token: string, lat: number | null, lng: number | null, accuracy: number | null, deviceId: string) => 
    API.post('/attendance/scan', { 
      qr_token: token, 
      latitude: lat, 
      longitude: lng, 
      location_accuracy: accuracy,
      device_id: deviceId 
    }),
  teacherHistory: () => API.get('/attendance/teacher-history'),
  deleteSession: (id: number) => API.delete(`/attendance/sessions/${id}`),
  history: () => API.get('/attendance/my-history'),
};
export default API;
