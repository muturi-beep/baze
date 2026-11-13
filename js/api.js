const BASE_URL = "/v1";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "include",
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    console.error("Server returned non-JSON:", text);
    throw new Error(`Server error (${res.status}).`);
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  requestOtp: (identifier, channel) =>
    request("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ identifier, channel }),
    }),
  verifyOtp: (identifier, code, channel) =>
    request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ identifier, code, channel }),
    }),
  getMe: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  claimArtist: (artistId, artistName) =>
    request("/claims/artist", {
      method: "POST",
      body: JSON.stringify({ artistId, artistName }),
    }),
  castVote: (cycleId, trackId, artistId, idempotencyKey) =>
    request("/votes", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ cycleId, trackId, artistId }),
    }),
  getLeaderboard: () => request("/leaderboard"),
  getCatalog: () => request("/catalog"),
  getResults: () => request("/catalog/results"),

  // Admin endpoints
  addTrack: (data) =>
    request("/admin/add-track", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  resetCycle: () =>
    request("/admin/reset-cycle", {
      method: "POST",
    }),

  // Admin Track Management
  getAdminTracks: () => request("/admin/tracks"),
  deleteTrack: (id) => request(`/admin/tracks/${id}`, { method: "DELETE" }),
  updateTrack: (id, data) =>
    request(`/admin/tracks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Report endpoint
  submitReport: (data) =>
    request("/reports", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Claims
  requestClaim: (data) =>
    request("/claims/request", { method: "POST", body: JSON.stringify(data) }),
  getPendingClaims: () => request("/admin/claims"),
  approveClaim: (id) =>
    request(`/admin/claims/${id}/approve`, { method: "POST" }),

  // NEW: Submissions
  submitTrack: (data) => 
    request("/submissions", { method: "POST", body: JSON.stringify(data) }),
  getPendingSubmissions: () => request("/submissions/pending"),
  approveSubmission: (id) => 
    request(`/submissions/${id}/approve`, { method: "POST" }),
};