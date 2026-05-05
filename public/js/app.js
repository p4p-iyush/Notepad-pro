// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
let currentType = 'text';
let editingId   = null;
let allCards    = [];

// ═══════════════════════════════════════════
//  MODAL OPEN / CLOSE
// ═══════════════════════════════════════════
function openModal() {
  editingId = null;
  currentType = 'text';
  clearModal();
  setType('text');
  document.getElementById('modalTitle').textContent = 'New Thought';
  document.getElementById('typeSelectorWrapper').classList.remove('hidden');
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  clearModal();
}

function clearModal() {
  document.getElementById('thoughtTitle').value      = '';
  document.getElementById('thoughtTags').value       = '';
  document.getElementById('thoughtVisibility').value = 'private';
  document.getElementById('textContent').innerHTML   = '';
  document.getElementById('codeContent').value       = '';
  document.getElementById('todoList').innerHTML      = '';
  document.getElementById('codeLanguage').value      = 'javascript';

  // hide all editors
  ['textEditor','codeEditor','todoEditor'].forEach(id =>
    document.getElementById(id).classList.add('hidden')
  );

  // reset type buttons
  document.querySelectorAll('.type-btn').forEach(btn =>
    btn.classList.remove('border-violet-500','bg-violet-500/10')
  );
}

// ═══════════════════════════════════════════
//  TYPE SELECTOR
// ═══════════════════════════════════════════
function setType(type) {
  currentType = type;

  ['textEditor','codeEditor','todoEditor'].forEach(id =>
    document.getElementById(id).classList.add('hidden')
  );

  if (type === 'text') document.getElementById('textEditor').classList.remove('hidden');
  if (type === 'code') document.getElementById('codeEditor').classList.remove('hidden');
  if (type === 'todo') document.getElementById('todoEditor').classList.remove('hidden');

  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.remove('border-violet-500','bg-violet-500/10','text-violet-300');
  });
  const active = document.querySelector(`.type-btn[data-type="${type}"]`);
  if (active) active.classList.add('border-violet-500','bg-violet-500/10','text-violet-300');
}

// ═══════════════════════════════════════════
//  TEXT FORMATTING
// ═══════════════════════════════════════════
function fmt(command, value = null) {
  document.getElementById('textContent').focus();
  document.execCommand(command, false, value);
}

// ═══════════════════════════════════════════
//  TODO HELPERS
// ═══════════════════════════════════════════
function addTodoItem(text = '', done = false) {
  const list = document.getElementById('todoList');
  const id   = 'todo-' + Date.now() + Math.random();

  const div = document.createElement('div');
  div.className = 'flex items-center gap-2 group';
  div.innerHTML = `
    <input type="checkbox" class="todo-check" ${done ? 'checked' : ''}
      onchange="this.nextElementSibling.classList.toggle('line-through', this.checked);
                this.nextElementSibling.classList.toggle('text-gray-600', this.checked)"/>
    <input type="text" value="${text}" placeholder="Todo item..."
      class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5
             text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500
             ${done ? 'line-through text-gray-600' : ''}"/>
    <button onclick="this.parentElement.remove()"
      class="text-gray-700 hover:text-red-400 transition opacity-0 group-hover:opacity-100 text-lg leading-none">
      ×
    </button>
  `;
  list.appendChild(div);
  div.querySelector('input[type="text"]').focus();
}

function getTodoItems() {
  const rows = document.querySelectorAll('#todoList > div');
  return Array.from(rows).map(row => ({
    text: row.querySelector('input[type="text"]').value.trim(),
    done: row.querySelector('input[type="checkbox"]').checked
  })).filter(item => item.text !== '');
}

// ═══════════════════════════════════════════
//  SAVE (CREATE or UPDATE)
// ═══════════════════════════════════════════
async function saveThought() {
  const title      = document.getElementById('thoughtTitle').value.trim() || 'Untitled';
  const visibility = document.getElementById('thoughtVisibility').value;
  const tags       = document.getElementById('thoughtTags').value;

  let content;
  if (currentType === 'text') {
    content = document.getElementById('textContent').innerHTML;
  } else if (currentType === 'code') {
    content = JSON.stringify({
      language: document.getElementById('codeLanguage').value,
      code:     document.getElementById('codeContent').value
    });
  } else {
    content = JSON.stringify(getTodoItems());
  }

  const body = { type: currentType, title, content, visibility, tags };

  const url    = editingId ? `/thoughts/${editingId}` : '/thoughts';
  const method = editingId ? 'PUT' : 'POST';

  const res  = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();

  if (data.success) {
    closeModal();
    window.location.reload();
  } else {
    alert('Error saving: ' + (data.error || 'Unknown error'));
  }
}

// ═══════════════════════════════════════════
//  EDIT
// ═══════════════════════════════════════════
async function editThought(id) {
  // fetch thought data from the card DOM
  const card = document.querySelector(`.thought-card[data-id="${id}"]`);
  if (!card) return;

  editingId   = id;
  currentType = card.dataset.type;

  document.getElementById('modalTitle').textContent = 'Edit Thought';
  document.getElementById('typeSelectorWrapper').classList.add('hidden');

  // fetch fresh data from server
  const res  = await fetch(`/thoughts/${id}`);
  const data = await res.json();
  if (!data.thought) return;

  const t = data.thought;

  document.getElementById('thoughtTitle').value      = t.title;
  document.getElementById('thoughtVisibility').value = t.visibility;
  document.getElementById('thoughtTags').value       = (t.tags || []).join(', ');

  setType(t.type);

  if (t.type === 'text') {
    document.getElementById('textContent').innerHTML = t.content || '';
  } else if (t.type === 'code') {
    const c = typeof t.content === 'object' ? t.content : JSON.parse(t.content);
    document.getElementById('codeLanguage').value = c.language;
    document.getElementById('codeContent').value  = c.code;
  } else if (t.type === 'todo') {
    const items = typeof t.content === 'object' ? t.content : JSON.parse(t.content);
    items.forEach(item => addTodoItem(item.text, item.done));
  }

  document.getElementById('modal').classList.remove('hidden');
}

// ═══════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════
async function deleteThought(id) {
  if (!confirm('Delete this thought?')) return;

  const res  = await fetch(`/thoughts/${id}`, { method: 'DELETE' });
  const data = await res.json();

  if (data.success) {
    document.querySelector(`.thought-card[data-id="${id}"]`)?.remove();
  } else {
    alert('Error deleting thought');
  }
}

// ═══════════════════════════════════════════
//  PIN
// ═══════════════════════════════════════════
async function pinThought(id, currentlyPinned) {
  const res  = await fetch(`/thoughts/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ pinned: !currentlyPinned })
  });
  const data = await res.json();
  if (data.success) window.location.reload();
}

// ═══════════════════════════════════════════
//  FILTER BY TYPE
// ═══════════════════════════════════════════
function filterThoughts(type) {
  const cards = document.querySelectorAll('.thought-card');

  cards.forEach(card => {
    const show = type === 'all' || card.dataset.type === type;
    card.style.display = show ? '' : 'none';
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === type);
  });
}

// ═══════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const q     = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll('.thought-card');

    cards.forEach(card => {
      const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
      const tags  = card.querySelectorAll('.thought-card span');
      const show  = title.includes(q);
      card.style.display = show ? '' : 'none';
    });
  });

  // close modal on backdrop click
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal')) closeModal();
  });
});

// ═══════════════════════════════════════════
//  KEYBOARD SHORTCUT  (Escape = close modal)
// ═══════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});