let serverUrl = 'http://134.122.118.9:3001'
let pendingData = null
let panelOpen = false

chrome.storage.sync.get('serverUrl', (d) => { if (d.serverUrl) serverUrl = d.serverUrl })

// Field matching rules: [label patterns, value getter from fields object]
const FIELD_RULES = [
  { patterns: ['first.?name', 'firstname', 'fname'], key: '_first_name' },
  { patterns: ['last.?name', 'lastname', 'lname', 'surname'], key: '_last_name' },
  { patterns: ['^name$', 'full.?name', 'your.?name', 'applicant.?name'], key: 'Full Name' },
  { patterns: ['email', 'e-mail'], key: 'Email' },
  { patterns: ['phone', 'mobile', 'telephone', 'cell'], key: 'Phone' },
  { patterns: ['address', 'city', 'location'], key: 'Address / City' },
  { patterns: ['university', 'college', 'institution', 'school'], key: 'University / Institution' },
  { patterns: ['degree', 'education.?level'], key: 'Degree' },
  { patterns: ['major', 'field.?of.?study', 'program', 'course.?of.?study'], key: 'Major / Field of Study' },
  { patterns: ['^gpa$', 'grade.?point', 'academic.?average'], key: 'GPA' },
  { patterns: ['graduation', 'grad.?year', 'expected.?grad'], key: 'Expected Graduation' },
  { patterns: ['employer', 'current.?job', 'current.?position', 'occupation'], key: 'Current Employer / Title' },
  { patterns: ['skills', 'competencies'], key: 'Skills (comma-separated)' },
  { patterns: ['cover.?letter', 'personal.?statement', 'essay', 'statement.?of.?purpose', 'motivation'], key: '_cover_letter' },
]

function getFieldValue(key, fields, coverLetter) {
  if (key === '_cover_letter') return coverLetter || ''
  if (key === '_first_name') return (fields['Full Name'] || '').split(' ')[0] || ''
  if (key === '_last_name') {
    const parts = (fields['Full Name'] || '').split(' ')
    return parts.length > 1 ? parts.slice(1).join(' ') : ''
  }
  return fields[key] || ''
}

function matchesPattern(text, patterns) {
  const t = (text || '').toLowerCase().trim()
  return patterns.some(p => new RegExp(p, 'i').test(t))
}

function getElementLabel(el) {
  // Try label element
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`)
    if (label) return label.textContent
  }
  // Try aria-label
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label')
  // Try placeholder
  if (el.placeholder) return el.placeholder
  // Try name attribute
  if (el.name) return el.name
  // Try surrounding label
  const parent = el.closest('label')
  if (parent) return parent.textContent
  return ''
}

function setNativeValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) {
    setter.call(el, value)
  } else {
    el.value = value
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function fillForms(fields, coverLetter) {
  const inputs = document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea')
  let filled = 0

  inputs.forEach(el => {
    const label = getElementLabel(el)
    for (const rule of FIELD_RULES) {
      if (matchesPattern(label, rule.patterns)) {
        const value = getFieldValue(rule.key, fields, coverLetter)
        if (value) {
          setNativeValue(el, value)
          el.style.backgroundColor = '#f0fdf4'
          el.style.borderColor = '#16a34a'
          filled++
          break
        }
      }
    }
  })
  return filled
}

function showToast(msg, color = '#16a34a') {
  const t = document.createElement('div')
  t.className = 'applyai-toast'
  t.style.background = color
  t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 3000)
}

function buildPanel(data) {
  let panel = document.getElementById('applyai-panel')
  if (panel) panel.remove()

  panel = document.createElement('div')
  panel.id = 'applyai-panel'

  const fields = data.fields || {}
  const coverLetter = data.cover_letter || ''
  const title = data.listing_title || 'Application'
  const org = data.listing_org || ''

  panel.innerHTML = `
    <div id="applyai-panel-header">
      <h2>✦ ApplyAI — ${org || title}</h2>
      <button id="applyai-close">✕</button>
    </div>
    <div id="applyai-panel-body">
      <div class="applyai-section">
        <div class="applyai-section-title">Applying to</div>
        <div style="color:#a5b4fc;font-size:14px;font-weight:600">${title}</div>
        ${org ? `<div style="color:#9ca3af;font-size:12px">${org}</div>` : ''}
      </div>
      <button id="applyai-fill-btn">⚡ Auto-Fill All Fields</button>
      <div class="applyai-section" style="margin-top:16px">
        <div class="applyai-section-title">Your Info</div>
        ${Object.entries(fields).filter(([,v]) => v).map(([k, v]) => `
          <div class="applyai-field">
            <div class="applyai-field-info">
              <div class="applyai-field-label">${k}</div>
              <div class="applyai-field-value">${v}</div>
            </div>
            <button class="applyai-copy" data-value="${encodeURIComponent(v)}">Copy</button>
          </div>
        `).join('')}
      </div>
      ${coverLetter ? `
        <div class="applyai-section">
          <div class="applyai-section-title">Cover Letter / Essay</div>
          <textarea id="applyai-cover-letter" rows="12">${coverLetter}</textarea>
          <button class="applyai-copy" style="width:100%;margin-top:6px;padding:8px;border-radius:6px" data-value="${encodeURIComponent(coverLetter)}">Copy Cover Letter</button>
        </div>
      ` : ''}
    </div>
  `

  document.body.appendChild(panel)
  requestAnimationFrame(() => panel.classList.add('open'))

  document.getElementById('applyai-close').addEventListener('click', () => {
    panel.classList.remove('open')
    panelOpen = false
    setTimeout(() => panel.remove(), 300)
  })

  document.getElementById('applyai-fill-btn').addEventListener('click', () => {
    const count = fillForms(fields, document.getElementById('applyai-cover-letter')?.value || coverLetter)
    showToast(count > 0 ? `✓ Filled ${count} field${count > 1 ? 's' : ''}` : '⚠ No matching fields found on this page')
  })

  panel.querySelectorAll('.applyai-copy[data-value]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(decodeURIComponent(btn.dataset.value))
      const orig = btn.textContent
      btn.textContent = 'Copied!'
      setTimeout(() => { btn.textContent = orig }, 1500)
    })
  })
}

async function fetchPending() {
  try {
    const r = await fetch(`${serverUrl}/api/pending-fill`, { cache: 'no-store' })
    if (!r.ok) return null
    const data = await r.json()
    return data && data.listing_title ? data : null
  } catch {
    return null
  }
}

async function init() {
  // Don't inject on the ApplyAI app itself
  if (window.location.href.includes(serverUrl.replace(/https?:\/\//, ''))) return

  pendingData = await fetchPending()

  const btn = document.createElement('button')
  btn.id = 'applyai-btn'

  if (pendingData) {
    btn.innerHTML = `✦ ApplyAI — Fill Form`
    btn.title = `Auto-fill for: ${pendingData.listing_title}`
  } else {
    btn.innerHTML = `✦ ApplyAI`
    btn.classList.add('no-data')
    btn.title = 'No pending application — click Apply & Track in ApplyAI first'
  }

  btn.addEventListener('click', async () => {
    if (!pendingData) {
      // Try fetching again in case data appeared
      pendingData = await fetchPending()
      if (!pendingData) {
        showToast('Open ApplyAI, pick a listing and click "Apply & Track" first', '#dc2626')
        return
      }
    }
    if (panelOpen) return
    panelOpen = true
    buildPanel(pendingData)
    // Auto-fill immediately
    const count = fillForms(pendingData.fields || {}, pendingData.cover_letter || '')
    if (count > 0) showToast(`✓ Auto-filled ${count} field${count > 1 ? 's' : ''}`)
  })

  document.body.appendChild(btn)
}

init()
