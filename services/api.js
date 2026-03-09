/**
 * SERVIÇO: api.js
 * Faz a comunicação com o backend Node.js (http://localhost:3000)
 *
 * @module ApiService
 */

const BASE_URL = 'http://localhost:3000/api';

const AuthAPI = {
  async login(email, password) {
    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        StorageService.setSession(data.user);
      }
      return data;
    } catch (e) {
      return { success: false, message: 'Erro de comunicação com o servidor.' };
    }
  },

  async register(userData) {
    try {
      const res = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Erro de comunicação com o servidor.' };
    }
  },

  logout() {
    StorageService.clearSession();
  },
};

const EventsAPI = {
  async getAll(filters = {}) {
    try {
      let url = `${BASE_URL}/events`;
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Erro de comunicação com o servidor.' };
    }
  },

  async getById(id) {
    try {
      const res = await fetch(`${BASE_URL}/events/${id}`);
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Erro de comunicação com o servidor.' };
    }
  },

  async register(eventId, userId) {
    try {
      const res = await fetch(`${BASE_URL}/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      return await res.json(); // { success, message }
    } catch (e) {
      return { success: false, message: 'Erro na requisição.' };
    }
  },

  async checkRegistration(eventId, userId) {
    try {
      const res = await fetch(`${BASE_URL}/events/${eventId}/check-registration?userId=${userId}`);
      return await res.json();
    } catch (e) {
      return { success: false, registered: false };
    }
  },

  async create(eventData, creatorId) {
    try {
      const res = await fetch(`${BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...eventData, createdBy: creatorId })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Erro de comunicação com o servidor.' };
    }
  },

  async deleteEvent(eventId, userId, userRole) {
    try {
      const res = await fetch(`${BASE_URL}/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userRole })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Erro na requisição.' };
    }
  },
};
