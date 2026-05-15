import API from "./axios"; // your axios instance with baseURL + token
import { CreateSessionPayload } from "./types";

export const createSession = (payload: CreateSessionPayload) => API.post("/sessions", payload);
export const getMySessions = () => API.get("/sessions/mine");
export const getMyInvites  = () => API.get("/sessions/invites");
export const respondInvite = (id: string, action: 'accepted' | 'declined') => API.post(`/sessions/${id}/respond`, { action });
export const cancelSession = (id: string) => API.post(`/sessions/${id}/cancel`);

