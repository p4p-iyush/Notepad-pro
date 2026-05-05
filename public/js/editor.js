// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
let blocks    = [...BLOCKS]; // injected from editor.ejs
let saveTimer = null;

// ═══════════════════════════════════════════
//  INIT — render all blocks on page load
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  blocks.forEach(block => renderBlock(block));
  Prism.highlightAll();

  // title change → autosave
  document.getElementById('docTitle').addEventListener('input', scheduleSave);

  // visibility change → autosave
  document.getElementById('docVisibility').addEventListener('change', scheduleSave);

  // hide floating toolbar on click outside
  document.addEventListener('mousedown', (e) => {
    const toolbar = document.getElementById('floatingToolbar');
    if (!toolbar.contains(e.target)) {
      toolbar.classList.add('hidden');
    }
  });
});

// ═══════════════════════════════════════════
//  RENDER A BLOCK
// ═══════════════════════════════════════════
function renderBlock(block) {
  const container = document.getElementById('blocksContainer');
  const wrapper   = document.createElement('div');

  wrapper.className    = 'block-wrapper';
  wrapper.dataset.id   = block.id;
  wrapper.dataset.type = block.type;

  // block controls (move up / move down / delete)
  wrapper.innerHTML = `
    <div class="block-controls">
      <button class="block-control-btn" onclick="moveBlock('${block.id}', -1)" title="Move up">↑</button>
      <button class="block-control-btn" onclick="moveBlock('${block.id}',  1)" title="Move down">↓</button>
      <button class="block-control-btn delete" onclick="deleteBlock('${block.id}')" title="Delete">✕</button>
    </div>
  `;

  // append the right inner block
  if (block.type === 'text') {
    wrapper.appendChild(buildTextBlock(block));
  } else if (block.type === 'code') {
    wrapper.appendChild(buildCodeBlock(block));
  } else if (block.type === 'todo') {
    wrapper.appendChild(buildTodoBlock(block));
  }

  container.appendChild(wrapper);
}

// ═══════════════════════════════════════════
//  BUILD TEXT BLOCK
// ═══════════════════════════════════════════
function buildTextBlock(block) {
  const div = document.createElement('div');
  div.className          = 'text-block';
  div.contentEditable    = 'true';
  div.dataset.blockId    = block.id;
  div.dataset.placeholder = 'Write something...';
  div.innerHTML          = block.content || '';

  // show floating toolbar on text select
  div.addEventListener('mouseup', () => showToolbar());
  div.addEventListener('keyup',   () => showToolbar());

  // autosave on input
  div.addEventListener('input', () => {
    updateBlockContent(block.id, div.innerHTML);
    scheduleSave();
  });

  return div;
}

// ═══════════════════════════════════════════
//  BUILD CODE BLOCK
// ═══════════════════════════════════════════
function buildCodeBlock(block) {
  const content  = block.content || { language: 'javascript', code: '' };
  const language = content.language || 'javascript';
  const code     = content.code     || '';

  const wrapper = document.createElement('div');
  wrapper.className = 'code-block-wrapper';

  wrapper.innerHTML = `
    <div class="code-block-header">
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">💻 Code</span>
        <select class="code-lang-select" data-block-id="${block.id}"
          onchange="updateCodeLang('${block.id}', this.value)">
          <option value="javascript" ${language === 'javascript' ? 'selected' : ''}>JavaScript</option>
          <option value="python"     ${language === 'python'     ? 'selected' : ''}>Python</option>
          <option value="css"        ${language === 'css'        ? 'selected' : ''}>CSS</option>
          <option value="markup"     ${language === 'markup'     ? 'selected' : ''}>HTML</option>
          <option value="bash"       ${language === 'bash'       ? 'selected' : ''}>Bash</option>
          <option value="json"       ${language === 'json'       ? 'selected' : ''}>JSON</option>
        </select>
      </div>
      <button onclick="copyCode('${block.id}')"
        class="text-xs text-gray-500 hover:text-violet-400 transition">
        📋 Copy
      </button>
    </div>
    <textarea
      class="code-textarea"
      data-block-id="${block.id}"
      placeholder="Write your code here..."
      oninput="updateCodeContent('${block.id}', this.value)"
    >${code}</textarea>
  `;

  return wrapper;
}

// ═══════════════════════════════════════════
//  BUILD TODO BLOCK
// ═══════════════════════════════════════════
function buildTodoBlock(block) {
  const items   = Array.isArray(block.content) ? block.content : [];
  const wrapper = document.createElement('div');
  wrapper.className      = 'todo-block-wrapper';
  wrapper.dataset.blockId = block.id;

  const list = document.createElement('div');
  list.className      = 'todo-list';
  list.dataset.blockId = block.id;

  items.forEach(item => {
    list.appendChild(buildTodoItem(block.id, item.text, item.done));
  });

  const addBtn = document.createElement('button');
  addBtn.className   = 'add-todo-btn';
  addBtn.textContent = '+ Add item';
  addBtn.onclick     = () => {
    const newItem = buildTodoItem(block.id, '', false);
    list.appendChild(newItem);
    newItem.querySelector('.todo-input').focus();
    syncTodo(block.id);
  };

  wrapper.appendChild(list);
  wrapper.appendChild(addBtn);
  return wrapper;
}

function buildTodoItem(blockId, text = '', done = false) {
  const div = document.createElement('div');
  div.className = 'todo-item';

  const check = document.createElement('input');
  check.type      = 'checkbox';
  check.className = 'todo-check';
  check.checked   = done;
  check.onchange  = () => {
    input.classList.toggle('done', check.checked);
    syncTodo(blockId);
  };

  const input = document.createElement('input');
  input.type        = 'text';
  input.className   = `todo-input ${done ? 'done' : ''}`;
  input.value       = text;
  input.placeholder = 'Todo item...';
  input.oninput     = () => syncTodo(blockId);

  // press Enter → add new item
  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const list    = document.querySelector(`.todo-list[data-block-id="${blockId}"]`);
      const newItem = buildTodoItem(blockId, '', false);
      div.after(newItem);
      newItem.querySelector('.todo-input').focus();
      syncTodo(blockId);
    }
    // Backspace on empty → remove item
    if (e.key === 'Backspace' && input.value === '') {
      e.preventDefault();
      const prev = div.previousElementSibling;
      div.remove();
      if (prev) prev.querySelector('.todo-input')?.focus();
      syncTodo(blockId);
    }
  };

  const del = document.createElement('button');
  del.className   = 'todo-delete';
  del.textContent = '×';
  del.onclick     = () => {
    div.remove();
    syncTodo(blockId);
  };

  div.appendChild(check);
  div.appendChild(input);
  div.appendChild(del);
  return div;
}

// ═══════════════════════════════════════════
//  SYNC TODO → blocks state
// ═══════════════════════════════════════════
function syncTodo(blockId) {
  const list  = document.querySelector(`.todo-list[data-block-id="${blockId}"]`);
  const items = Array.from(list.querySelectorAll('.todo-item')).map(row => ({
    text: row.querySelector('.todo-input').value.trim(),
    done: row.querySelector('.todo-check').checked
  }));

  updateBlockContent(blockId, items);
  scheduleSave();
}

// ═══════════════════════════════════════════
//  UPDATE BLOCK CONTENT IN STATE
// ═══════════════════════════════════════════
function updateBlockContent(blockId, content) {
  const block = blocks.find(b => b.id === blockId);
  if (block) block.content = content;
}

function updateCodeContent(blockId, code) {
  const block = blocks.find(b => b.id === blockId);
  if (block) {
    if (typeof block.content !== 'object') block.content = {};
    block.content.code = code;
  }
  scheduleSave();
}

function updateCodeLang(blockId, language) {
  const block = blocks.find(b => b.id === blockId);
  if (block) {
    if (typeof block.content !== 'object') block.content = {};
    block.content.language = language;
  }
  scheduleSave();
}

// ═══════════════════════════════════════════
//  ADD NEW BLOCK
// ═══════════════════════════════════════════
function addBlock(type) {
  const newBlock = {
    id:      Math.random().toString(36).substring(2, 10),
    type,
    content: type === 'text' ? ''
           : type === 'code' ? { language: 'javascript', code: '' }
           : []
  };

  blocks.push(newBlock);
  renderBlock(newBlock);

  // scroll to new block + focus
  const wrapper = document.querySelector(`.block-wrapper[data-id="${newBlock.id}"]`);
  wrapper?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(() => {
    if (type === 'text') {
      wrapper?.querySelector('.text-block')?.focus();
    } else if (type === 'code') {
      wrapper?.querySelector('.code-textarea')?.focus();
    } else if (type === 'todo') {
      const addBtn = wrapper?.querySelector('.add-todo-btn');
      addBtn?.click();
    }
  }, 100);

  scheduleSave();
}

// ═══════════════════════════════════════════
//  DELETE BLOCK
// ═══════════════════════════════════════════
function deleteBlock(blockId) {
  if (blocks.length === 1 && !confirm('Delete the only block?')) return;

  blocks = blocks.filter(b => b.id !== blockId);
  document.querySelector(`.block-wrapper[data-id="${blockId}"]`)?.remove();
  scheduleSave();
}

// ═══════════════════════════════════════════
//  MOVE BLOCK UP / DOWN
// ═══════════════════════════════════════════
function moveBlock(blockId, direction) {
  const idx = blocks.findIndex(b => b.id === blockId);
  const newIdx = idx + direction;

  if (newIdx < 0 || newIdx >= blocks.length) return;

  // swap in state
  [blocks[idx], blocks[newIdx]] = [blocks[newIdx], blocks[idx]];

  // re-render all blocks
  const container = document.getElementById('blocksContainer');
  container.innerHTML = '';
  blocks.forEach(block => renderBlock(block));

  scheduleSave();
}

// ═══════════════════════════════════════════
//  COPY CODE
// ═══════════════════════════════════════════
function copyCode(blockId) {
  const textarea = document.querySelector(`.code-textarea[data-block-id="${blockId}"]`);
  if (!textarea) return;

  navigator.clipboard.writeText(textarea.value).then(() => {
    const btn = document.querySelector(
      `.block-wrapper[data-id="${blockId}"] button[onclick^="copyCode"]`
    );
    if (btn) {
      btn.textContent = '✅ Copied!';
      setTimeout(() => btn.textContent = '📋 Copy', 1500);
    }
  });
}

// ═══════════════════════════════════════════
//  FLOATING TEXT TOOLBAR
// ═══════════════════════════════════════════
function showToolbar() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    document.getElementById('floatingToolbar').classList.add('hidden');
    return;
  }

  const range   = selection.getRangeAt(0);
  const rect    = range.getBoundingClientRect();
  const toolbar = document.getElementById('floatingToolbar');

  toolbar.classList.remove('hidden');
  toolbar.style.top  = `${window.scrollY + rect.top - toolbar.offsetHeight - 10}px`;
  toolbar.style.left = `${window.scrollX + rect.left + rect.width / 2 - toolbar.offsetWidth / 2}px`;
}

function fmt(command, value = null) {
  document.execCommand(command, false, value);

  // sync updated text block content back to state
  const activeEl = document.activeElement;
  if (activeEl && activeEl.classList.contains('text-block')) {
    const blockId = activeEl.dataset.blockId;
    updateBlockContent(blockId, activeEl.innerHTML);
  }
}

// ═══════════════════════════════════════════
//  SAVE
// ═══════════════════════════════════════════
function scheduleSave() {
  const status = document.getElementById('saveStatus');
  status.textContent = 'Saving...';
  status.classList.add('saving');

  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDoc, 1500); // autosave after 1.5s of inactivity
}

async function saveDoc() {
  const title      = document.getElementById('docTitle').value.trim() || 'Untitled';
  const visibility = document.getElementById('docVisibility').value;
  const status     = document.getElementById('saveStatus');

  try {
    const res  = await fetch(`/documents/${DOC_ID}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, visibility, blocks })
    });
    const data = await res.json();

    if (data.success) {
      status.textContent = 'All saved ✓';
      status.classList.remove('saving');
      status.style.color = '#10b981';
      setTimeout(() => status.style.color = '', 2000);
    } else {
      status.textContent = 'Save failed ✗';
      status.classList.remove('saving');
      status.style.color = '#ef4444';
    }
  } catch (err) {
    status.textContent = 'Save failed ✗';
    status.classList.remove('saving');
    status.style.color = '#ef4444';
  }
}

// ═══════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S → save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveDoc();
  }
});