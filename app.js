// ====== CONFIG ======
const API_URL = 'http://localhost:3001/api/students';

// ====== ELEMENTS ======
const form = document.getElementById('studentForm');
const idEl = document.getElementById('studentId');
const nameEl = document.getElementById('name');
const ageEl = document.getElementById('age');
const courseEl = document.getElementById('course');
const formMsg = document.getElementById('formMsg');
const resetBtn = document.getElementById('resetBtn');

const tbody = document.getElementById('studentsBody');
const listMsg = document.getElementById('listMsg');
const searchEl = document.getElementById('search');

// ====== STATE ======
let students = [];     // fetched from backend
let filtered = [];     // after search

// ====== HELPERS ======
function setErr(field, msg) {
  const el = document.querySelector(`[data-err="${field}"]`);
  if (el) el.textContent = msg || '';
}
function clearErrors() {
  setErr('name',''); setErr('age',''); setErr('course','');
}
function validate() {
  clearErrors();
  const name = nameEl.value.trim();
  const age = Number(ageEl.value);
  const course = courseEl.value.trim();
  let ok = true;

  if (!name) { setErr('name','Name is required'); ok = false; }
  if (!Number.isFinite(age) || age <= 0) { setErr('age','Valid age required'); ok = false; }
  if (!course) { setErr('course','Course is required'); ok = false; }

  return ok ? { name, age, course } : null;
}
function showFormMsg(text, type='info'){
  formMsg.textContent = text || '';
  formMsg.style.color = type === 'error' ? '#f43f5e' : (type === 'success' ? '#22c55e' : '#94a3b8');
}
function showListMsg(text){
  listMsg.textContent = text || '';
}
function resetForm(){
  idEl.value = '';
  form.reset();
  clearErrors();
  showFormMsg('');
}

// Render table rows
function renderRows(list){
  if (!list.length){
    tbody.innerHTML = `<tr><td colspan="5" class="muted">No records found.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map((s, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${escapeHtml(s.name)}</td>
      <td><span class="badge">${s.age}</span></td>
      <td>${escapeHtml(s.course)}</td>
      <td>
        <div class="row-actions">
          <button class="action edit" data-id="${s.id}" data-act="edit">Edit</button>
          <button class="action delete" data-id="${s.id}" data-act="delete">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Simple XSS-safe escape
function escapeHtml(str=''){
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ====== API CALLS ======
async function apiGetAll(){
  const r = await fetch(API_URL);
  if (!r.ok) throw new Error('Failed to load');
  return r.json();
}
async function apiCreate(payload){
  const r = await fetch(API_URL, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  if (!r.ok) throw data;
  return data;
}
async function apiUpdate(id, payload){
  const r = await fetch(`${API_URL}/${id}`, {
    method:'PUT',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  if (!r.ok) throw data;
  return data;
}
async function apiDelete(id){
  const r = await fetch(`${API_URL}/${id}`, { method:'DELETE' });
  if (!r.ok) throw await r.json();
  return true;
}

// ====== LOAD & SEARCH ======
async function loadStudents(){
  try{
    showListMsg('Loading...');
    const data = await apiGetAll();
    students = data;
    filtered = data;
    renderRows(filtered);
    showListMsg('');
  }catch(e){
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Backend not reachable. Start your server at ${API_URL}.</td></tr>`;
    showListMsg('Tip: run backend, then refresh.');
  }
}

searchEl.addEventListener('input', () => {
  const q = searchEl.value.trim().toLowerCase();
  filtered = students.filter(s =>
    s.name.toLowerCase().includes(q) || s.course.toLowerCase().includes(q)
  );
  renderRows(filtered);
});

// ====== FORM SUBMIT ======
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = validate();
  if (!payload) { showFormMsg('Fix errors and try again.', 'error'); return; }

  try{
    if (idEl.value){
      // update
      await apiUpdate(idEl.value, payload);
      showFormMsg('Updated successfully.', 'success');
    } else {
      // create
      await apiCreate(payload);
      showFormMsg('Saved successfully.', 'success');
    }
    resetForm();
    await loadStudents();
  }catch(err){
    // err may be {errors:[...]} or {error:"..."}
    const msg = err?.errors?.join(' ') || err?.error || 'Request failed.';
    showFormMsg(msg, 'error');
  }
});

resetBtn.addEventListener('click', resetForm);

// ====== ROW ACTIONS (EDIT/DELETE) ======
tbody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = btn.dataset.id;
  const act = btn.dataset.act;

  if (act === 'edit'){
    const s = students.find(x => x.id === id);
    if (!s) return;
    idEl.value = s.id;
    nameEl.value = s.name;
    ageEl.value = s.age;
    courseEl.value = s.course;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showFormMsg('Editing mode — make changes and click Save.');
  }

  if (act === 'delete'){
    const ok = confirm('Delete this student?');
    if (!ok) return;
    try{
      await apiDelete(id);
      await loadStudents();
      showFormMsg('Deleted.', 'success');
    }catch(err){
      showFormMsg(err?.error || 'Delete failed.', 'error');
    }
  }
});

// ====== INIT ======
loadStudents();
