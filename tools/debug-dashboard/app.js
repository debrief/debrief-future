/**
 * Session State Debug Dashboard
 * Feature: 024-document-session-state
 */

// State
let eventSource = null;
let eventCount = 0;
let serverUrl = localStorage.getItem('serverUrl') || 'http://localhost:3001';
let currentState = null;

// DOM Elements
const serverUrlInput = document.getElementById('server-url');
const connectBtn = document.getElementById('connect-btn');
const connectionStatus = document.getElementById('connection-status');
const lastUpdateEl = document.getElementById('last-update');
const eventCountEl = document.getElementById('event-count');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load saved server URL
  serverUrlInput.value = serverUrl;

  // Check for URL parameter
  const params = new URLSearchParams(window.location.search);
  if (params.has('server')) {
    serverUrl = params.get('server');
    serverUrlInput.value = serverUrl;
  }

  // Setup event listeners
  connectBtn.addEventListener('click', toggleConnection);
  serverUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') toggleConnection();
  });

  // Setup editable fields
  setupEditableFields();

  // Auto-connect
  connect();
});

// Connection Management
function toggleConnection() {
  if (eventSource) {
    disconnect();
  } else {
    connect();
  }
}

function connect() {
  serverUrl = serverUrlInput.value;
  localStorage.setItem('serverUrl', serverUrl);

  try {
    eventSource = new EventSource(`${serverUrl}/sse`);

    eventSource.addEventListener('state-sync', handleStateSync);
    eventSource.addEventListener('temporal.currentTime', handleFieldUpdate);
    eventSource.addEventListener('temporal.timeRange', handleFieldUpdate);
    eventSource.addEventListener('temporal.playbackState', handleFieldUpdate);
    eventSource.addEventListener('temporal.playbackRate', handleFieldUpdate);
    eventSource.addEventListener('temporal.displayMode', handleFieldUpdate);
    eventSource.addEventListener('spatial.viewport', handleFieldUpdate);
    eventSource.addEventListener('spatial.rotation', handleFieldUpdate);
    eventSource.addEventListener('features.selection', handleFieldUpdate);
    eventSource.addEventListener('features.hiddenFeatureIds', handleFieldUpdate);
    eventSource.addEventListener('document.dirty', handleFieldUpdate);
    eventSource.addEventListener('error', handleFieldUpdate);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource = null;
    };
  } catch (err) {
    console.error('Connection error:', err);
    setConnected(false);
  }
}

function disconnect() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  setConnected(false);
}

function setConnected(connected) {
  connectionStatus.textContent = connected ? 'Connected' : 'Disconnected';
  connectionStatus.className = `status ${connected ? 'connected' : 'disconnected'}`;
  connectBtn.textContent = connected ? 'Disconnect' : 'Connect';
}

// Event Handlers
function handleStateSync(event) {
  const data = JSON.parse(event.data);
  currentState = data.state;
  eventCount++;
  updateUI(currentState);
  updateStatusBar();
}

function handleFieldUpdate(event) {
  const data = JSON.parse(event.data);
  eventCount++;

  if (data.type === 'field-update') {
    const fieldPath = `${data.slice}.${data.field}`;
    updateField(fieldPath, data.value);

    // Update currentState
    if (currentState) {
      if (!currentState[data.slice]) currentState[data.slice] = {};
      currentState[data.slice][data.field] = data.value;
    }
  }

  updateStatusBar();
}

// UI Updates
function updateUI(state) {
  if (!state) return;

  // Temporal
  updateField('temporal.currentTime', state.temporal?.currentTime);
  updateField('temporal.timeRange', state.temporal?.timeRange);
  updateField('temporal.playbackRate', state.temporal?.playbackRate);
  updateField('temporal.playbackState', state.temporal?.playbackState);
  updateField('temporal.displayMode', state.temporal?.displayMode);

  // Spatial
  updateField('spatial.viewport', state.spatial?.viewport);
  updateField('spatial.rotation', state.spatial?.rotation);

  // Features
  updateField('features.featureCollectionUri', state.features?.featureCollectionUri);
  updateField('features.selection', state.features?.selection);
  updateField('features.hiddenFeatureIds', state.features?.hiddenFeatureIds);

  // Document
  updateField('document.dirty', state.document?.dirty);
  updateField('document.savePath', state.document?.savePath);
}

function updateField(fieldPath, value) {
  const el = document.querySelector(`[data-field="${fieldPath}"]`);
  if (!el) return;

  const display = el.querySelector('.display');
  if (!display) return;

  // Format value for display
  let displayValue = formatValue(fieldPath, value);

  // Special handling for tree views
  if (el.classList.contains('tree')) {
    const treeContent = el.querySelector('.tree-content');
    if (treeContent) {
      treeContent.innerHTML = displayValue;
    }
  } else {
    display.textContent = displayValue;
  }

  // Special classes
  if (fieldPath === 'document.dirty') {
    display.className = `display dirty-indicator ${value}`;
  }

  // Flash animation
  el.classList.remove('updated');
  void el.offsetWidth; // Trigger reflow
  el.classList.add('updated');
}

function formatValue(fieldPath, value) {
  if (value === null || value === undefined) {
    return '--';
  }

  // Time instant
  if (fieldPath.includes('currentTime') && value?.iso) {
    return value.iso;
  }

  // Time range
  if (fieldPath.includes('timeRange') && value?.start && value?.end) {
    return `${value.start.iso} - ${value.end.iso}`;
  }

  // Viewport
  if (fieldPath === 'spatial.viewport' && value?.coordinates) {
    const coords = value.coordinates;
    return `[${coords.map(c => `[${c[0]}, ${c[1]}]`).join(', ')}]`;
  }

  // Selection (tree view)
  if (fieldPath === 'features.selection') {
    if (!value?.featureIds?.length) {
      return '<span class="display">No selection</span>';
    }
    return value.featureIds.map(id => {
      const isPrimary = id === value.primary;
      return `<div class="tree-item ${isPrimary ? 'primary' : ''}">${isPrimary ? '* ' : '  '}${id}</div>`;
    }).join('');
  }

  // Hidden features (tree view)
  if (fieldPath === 'features.hiddenFeatureIds') {
    if (!Array.isArray(value) || !value.length) {
      return '<span class="display">None</span>';
    }
    return value.map(id => `<div class="tree-item">${id}</div>`).join('');
  }

  // Boolean
  if (typeof value === 'boolean') {
    return String(value);
  }

  // Number
  if (typeof value === 'number') {
    return String(value);
  }

  // String
  if (typeof value === 'string') {
    return value;
  }

  // Object/Array
  return JSON.stringify(value);
}

function updateStatusBar() {
  lastUpdateEl.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
  eventCountEl.textContent = `Events: ${eventCount}`;
}

// Editable Fields
function setupEditableFields() {
  document.querySelectorAll('.value.editable').forEach(el => {
    el.addEventListener('click', () => startEditing(el));

    const input = el.querySelector('.edit');
    if (input) {
      input.addEventListener('blur', () => finishEditing(el));
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          finishEditing(el);
        }
      });
    }
  });
}

function startEditing(el) {
  if (el.classList.contains('editing')) return;

  el.classList.add('editing');
  const input = el.querySelector('.edit');
  const display = el.querySelector('.display');

  if (input && display) {
    input.value = display.textContent;
    input.focus();
    input.select();
  }
}

function finishEditing(el) {
  if (!el.classList.contains('editing')) return;

  el.classList.remove('editing');
  const input = el.querySelector('.edit');
  const fieldPath = el.dataset.field;

  if (input && fieldPath) {
    const value = input.value;
    sendUpdate(fieldPath, value);
  }
}

// MCP Tool Calls
async function sendUpdate(fieldPath, value) {
  const [slice, field] = fieldPath.split('.');

  let tool;
  let input = {};

  switch (fieldPath) {
    case 'temporal.playbackRate':
      tool = 'session.setPlaybackRate';
      input = { rate: parseFloat(value) };
      break;
    case 'temporal.displayMode':
      // Would need session.setDisplayMode tool
      console.log('No handler for field:', fieldPath);
      return;
    case 'spatial.rotation':
      tool = 'session.setRotation';
      input = { rotation: parseFloat(value) };
      break;
    default:
      console.log('No handler for field:', fieldPath);
      return;
  }

  try {
    const response = await fetch(`${serverUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, input }),
    });

    const result = await response.json();
    if (!result.success) {
      console.error('Update failed:', result.error);
    }
  } catch (err) {
    console.error('Update error:', err);
  }
}
