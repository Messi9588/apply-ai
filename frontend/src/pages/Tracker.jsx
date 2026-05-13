import React, { useState, useEffect } from 'react'
import { getApplications, updateApplication, deleteApplication } from '../api/client'
import { ExternalLink, Trash2, ChevronDown, Check, FileText, X } from 'lucide-react'

const STATUSES = ['saved', 'applied', 'interview', 'rejected', 'accepted']

const STATUS_STYLES = {
  saved: 'bg-gray-700 text-gray-200',
  applied: 'bg-blue-800 text-blue-100',
  interview: 'bg-yellow-800 text-yellow-100',
  rejected: 'bg-red-900 text-red-200',
  accepted: 'bg-green-800 text-green-100',
}

export default function Tracker() {
  const [apps, setApps] = useState([])
  const [filter, setFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [editNotes, setEditNotes] = useState('')
  const [editCL, setEditCL] = useState('')
  const [clTab, setClTab] = useState('notes')

  const load = () => getApplications().then(r => setApps(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const updateStatus = async (id, status) => {
    await updateApplication(id, { status })
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this application?')) return
    await deleteApplication(id)
    setApps(prev => prev.filter(a => a.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const openDetail = (app) => {
    setSelected(app)
    setEditNotes(app.notes || '')
    setEditCL(app.cover_letter || '')
    setClTab('notes')
  }

  const saveEdits = async () => {
    await updateApplication(selected.id, { notes: editNotes, cover_letter: editCL })
    setApps(prev => prev.map(a => a.id === selected.id ? { ...a, notes: editNotes, cover_letter: editCL } : a))
    setSelected(prev => ({ ...prev, notes: editNotes, cover_letter: editCL }))
  }

  const filtered = apps.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false
    if (typeFilter !== 'all' && a.listing_type !== typeFilter) return false
    return true
  })

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <div className={`flex flex-col ${selected ? 'hidden md:flex md:w-1/2' : 'w-full'} border-r border-gray-800`}>
        <div className="p-4 border-b border-gray-800 space-y-2">
          <h1 className="text-lg font-bold text-white">Application Tracker</h1>
          <div className="flex gap-2 flex-wrap">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm">
              <option value="all">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm">
              <option value="all">All Types</option>
              <option value="job">Jobs</option>
              <option value="scholarship">Scholarships</option>
            </select>
            <span className="text-sm text-gray-500 self-center">{filtered.length} applications</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-center text-gray-600 p-8">No applications. Search and save listings to get started.</p>
          )}
          {filtered.map(app => (
            <div
              key={app.id}
              onClick={() => openDetail(app)}
              className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-900 transition-colors ${selected?.id === app.id ? 'bg-gray-900 border-l-2 border-l-indigo-500' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{app.listing_title}</p>
                  <p className="text-xs text-gray-400 truncate">{app.listing_org}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <StatusBadge status={app.status} />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${app.listing_type === 'scholarship' ? 'bg-purple-900/40 text-purple-300' : 'bg-blue-900/40 text-blue-300'}`}>
                      {app.listing_type}
                    </span>
                    {app.applied_at && <span className="text-xs text-gray-500">Applied {new Date(app.applied_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); handleDelete(app.id) }}
                  className="text-gray-700 hover:text-red-400 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {STATUSES.map(s => (
                  <button key={s} onClick={e => { e.stopPropagation(); updateStatus(app.id, s) }}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${app.status === s ? STATUS_STYLES[s] + ' border-transparent' : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="flex-1 flex flex-col">
          <div className="p-5 border-b border-gray-800 flex items-start justify-between">
            <div>
              <h2 className="font-bold text-white">{selected.listing_title}</h2>
              <p className="text-sm text-gray-400">{selected.listing_org}</p>
            </div>
            <div className="flex gap-2">
              <a href={selected.listing_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg">
                <ExternalLink size={13} /> Open
              </a>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
          </div>

          <div className="flex border-b border-gray-800">
            {['notes', 'cover'].map(t => (
              <button key={t} onClick={() => setClTab(t)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 capitalize transition-colors ${clTab === t ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                {t === 'cover' ? 'Cover Letter' : 'Notes'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {clTab === 'notes' && (
              <>
                <p className="text-sm text-gray-400">Private notes (interview prep, contacts, follow-up dates)</p>
                <textarea
                  value={editNotes} onChange={e => setEditNotes(e.target.value)}
                  rows={10}
                  placeholder="Add notes about this application..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </>
            )}
            {clTab === 'cover' && (
              <>
                <p className="text-sm text-gray-400">Your cover letter for this application (editable)</p>
                <textarea
                  value={editCL} onChange={e => setEditCL(e.target.value)}
                  rows={16}
                  placeholder="Cover letter..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </>
            )}
            <button onClick={saveEdits} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[status] || 'bg-gray-700 text-gray-300'}`}>
      {status}
    </span>
  )
}
