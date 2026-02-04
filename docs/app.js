// Frontend logic: login, fetch tables, show rows
const loginPanel = document.getElementById('loginPanel');
const appPanel = document.getElementById('appPanel');
const loginForm = document.getElementById('loginForm');
const loginMsg = document.getElementById('loginMsg');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const welcome = document.getElementById('welcome');
const logoutBtn = document.getElementById('logoutBtn');
const tablesSelect = document.getElementById('tablesSelect');
const refreshBtn = document.getElementById('refreshTables');
const tableView = document.getElementById('tableView');
const tableTitle = document.getElementById('tableTitle');
const tableContainer = document.getElementById('tableContainer');

// read API base from runtime config set in config.js (served from the same site)
const API_BASE = (window && window.__API_BASE__) ? window.__API_BASE__ : '';

function setToken(token) {
  localStorage.setItem('lib_token', token);
}
function getToken() {
  return localStorage.getItem('lib_token');
}
function clearToken() {
  localStorage.removeItem('lib_token');
}

async function api(path, opts = {}) {
  opts.headers = opts.headers || {};
  const token = getToken();
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_BASE + path, opts);
  if (res.status === 401) {
    // unauthorized: drop token
    clearToken();
    renderUI();
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMsg.textContent = '';
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  try {
    const data = await api('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    setToken(data.token);
    welcome.textContent = `Welcome, ${data.user.name || data.user.username}`;
    renderUI();
    await loadTables();
  } catch (err) {
    console.error(err);
    loginMsg.textContent = err.message || 'Login failed';
  }
});

logoutBtn.addEventListener('click', () => {
  clearToken();
  renderUI();
});

refreshBtn.addEventListener('click', loadTables);

tablesSelect.addEventListener('change', () => {
  const t = tablesSelect.value;
  if (t) loadTableRows(t);
  else {
    tableView.classList.add('hidden');
  }
});

async function loadTables() {
  try {
    const data = await api('/api/tables');
    tablesSelect.innerHTML = '<option value="">-- select table --</option>';
    data.tables.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      tablesSelect.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    alert('Could not load tables: ' + err.message);
  }
}

function renderTable(rows) {
  if (!rows || rows.length === 0) {
    tableContainer.innerHTML = '<div>No rows</div>';
    return;
  }
  const cols = Object.keys(rows[0]);
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  cols.forEach(c => {
    const th = document.createElement('th');
    th.textContent = c;
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    cols.forEach(c => {
      const td = document.createElement('td');
      td.textContent = r[c] === null ? '' : r[c];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tableContainer.innerHTML = '';
  tableContainer.appendChild(table);
}

async function loadTableRows(table) {
  try {
    tableTitle.textContent = table;
    const data = await api('/api/tables/' + encodeURIComponent(table));
    renderTable(data.rows);
    tableView.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    alert('Could not load table: ' + err.message);
  }
}

function renderUI() {
  if (getToken()) {
    loginPanel.classList.add('hidden');
    appPanel.classList.remove('hidden');
    // attempt to load tables
    loadTables().catch(() => {});
  } else {
    loginPanel.classList.remove('hidden');
    appPanel.classList.add('hidden');
  }
}

renderUI();
