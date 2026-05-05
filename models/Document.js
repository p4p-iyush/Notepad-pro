const mongoose = require('mongoose');

// ─── Block Schema ─────────────────────────────────────
const blockSchema = new mongoose.Schema({
  id: {
    type:    String,
    default: () => Math.random().toString(36).substring(2, 10)
  },
  type: {
    type:     String,
    enum:     ['text', 'code', 'todo'],
    required: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    // text → "<p>Hello <b>world</b></p>"
    // code → { language: "javascript", code: "console.log()" }
    // todo → [{ text: "Buy milk", done: false }]
  }
}, { _id: false });

// ─── Document Schema ──────────────────────────────────
const documentSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true
  },
  title: {
    type:    String,
    default: 'Untitled',
    trim:    true
  },
  visibility: {
    type:    String,
    enum:    ['public', 'private'],
    default: 'private'
  },
  tags: {
    type:    [String],
    default: []
  },
  pinned: {
    type:    Boolean,
    default: false
  },
  blocks: {
    type:    [blockSchema],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);