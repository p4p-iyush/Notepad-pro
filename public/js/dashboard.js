// ═══════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════
function openModal() {
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('docTitle').focus();
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('docTitle').value      = '';
  document.getElementById('docVisibility').value = 'private';
  document.getElementById('docTags').value       = '';
}

// close on backdrop click
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal')) closeModal();
});

// ═══════════════════════════════════════════
//  CREATE DOCUMENT
// ═══════════════════════════════════════════
async function createDoc() {
  const title      = document.getElementById('docTitle').value.trim() || 'Untitled';
  const visibility = document.getElementById('docVisibility').value;
  const tags       = document.getElementById('docTags').value;

  const res  = await fetch('/documents', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ title, visibility, tags })
  });
  const data = await res.json();

  if (data.success) {
    window.location.href = `/editor/${data.id}`;
  } else {
    alert('Error creating document: ' + (data.error || 'Unknown'));
  }
}

// ═══════════════════════════════════════════
//  OPEN DOCUMENT
// ═══════════════════════════════════════════
function openDoc(id) {
  window.location.href = `/editor/${id}`;
}

// ═══════════════════════════════════════════
//  DELETE DOCUMENT
// ═══════════════════════════════════════════
async function deleteDoc(id) {
  if (!confirm('Delete this document? This cannot be undone.')) return;

  const res  = await fetch(`/documents/${id}`, { method: 'DELETE' });
  const data = await res.json();

  if (data.success) {
    document.querySelector(`.doc-card[data-id="${id}"]`)?.remove();

    // show empty state if no docs left
    const grid = document.getElementById('docsGrid');
    if (grid.querySelectorAll('.doc-card').length === 0) {
      grid.innerHTML = `
        <div class="col-span-3 text-center text-gray-600 py-20">
          <p class="text-5xl mb-4">🧠</p>
          <p class="text-lg">No documents yet. Create your first one!</p>
        </div>`;
    }
  } else {
    alert('Error deleting document');
  }
}

// ═══════════════════════════════════════════
//  PIN DOCUMENT
// ═══════════════════════════════════════════
async function pinDoc(id, currentlyPinned) {
  const res  = await fetch(`/documents/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ pinned: !currentlyPinned })
  });
  const data = await res.json();
  if (data.success) window.location.reload();
}

// ═══════════════════════════════════════════
//  FILTER BY VISIBILITY
// ═══════════════════════════════════════════
function filterDocs(type) {
  const cards = document.querySelectorAll('.doc-card');

  cards.forEach(card => {
    const show = type === 'all' || card.dataset.visibility === type;
    card.style.display = show ? '' : 'none';
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === type);
  });
}

// ═══════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════
document.getElementById('searchInput').addEventListener('input', function () {
  const q     = this.value.toLowerCase();
  const cards = document.querySelectorAll('.doc-card');

  cards.forEach(card => {
    const title = card.dataset.title || '';
    const tags  = card.querySelectorAll('span');
    let   match = title.includes(q);

    tags.forEach(tag => {
      if (tag.textContent.toLowerCase().includes(q)) match = true;
    });

    card.style.display = match ? '' : 'none';
  });
});

// ═══════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  // Escape closes modal
  if (e.key === 'Escape') closeModal();

  // Ctrl/Cmd + N opens new doc modal
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    openModal();
  }
});