import API from "../api/axios"; // your axios instance with baseURL + token

export const createSession = (payload) => API.post("/sessions", payload);
export const getMySessions = () => API.get("/sessions/mine");
export const getMyInvites  = () => API.get("/sessions/invites");
export const respondInvite = (id, action) => API.post(`/sessions/${id}/respond`, { action });
export const cancelSession = (id) => API.post(`/sessions/${id}/cancel`);
