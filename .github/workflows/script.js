

// --- Admin helpers added ---
function logout() { localStorage.removeItem('ecg_token'); }
async function fetchVendors() {
  const res = await fetch('/backend/api/vendors', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch vendors');
  return res.json();
}
async function fetchTickets() {
  const res = await fetch('/backend/api/tickets', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch tickets');
  return res.json();
}
async function updateTicketStatus(id, status) {
  const res = await fetch('/backend/api/tickets/' + id, {
    method: 'PUT',
    headers: Object.assign({'Content-Type':'application/json'}, authHeaders()),
    body: JSON.stringify({ status })
  });
  return res.json();
}
async function assignTicket(id, assigned_to) {
  const res = await fetch('/backend/api/tickets/' + id + '/assign', {
    method: 'PUT',
    headers: Object.assign({'Content-Type':'application/json'}, authHeaders()),
    body: JSON.stringify({ assigned_to })
  });
  return res.json();
}
async function searchVendors(q) {
  const res = await fetch('/backend/api/vendors/search?q=' + encodeURIComponent(q), { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}
// login override to store token
async function login(username, password) {
  const res = await fetch('/backend/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  localStorage.setItem('ecg_token', data.token);
  return data.token;
}
function authHeaders() { const t = localStorage.getItem('ecg_token'); return t ? { 'Authorization': 'Bearer ' + t } : {}; }
