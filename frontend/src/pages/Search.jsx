import React, { useState, useEffect } from 'react'
import { searchListings, getAllScholarships, generateCoverLetter, generateFormData, saveApplication } from '../api/client'
import { Search, Briefcase, GraduationCap, MapPin, DollarSign, Calendar, ExternalLink, Sparkles, BookmarkPlus, Copy, Check, ChevronDown, ChevronUp, Loader } from 'lucide-react'

const TYPE_COLORS = {
  job: 'bg-blue-900/40 text-blue-300 border-blue-800',
  scholarship: 'bg-purple-900/40 text-purple-300 border-purple-800',
}

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [location, setLocation] = useState('')
  const [listingType, setListingType] = useState('all')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [formFields, setFormFields] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState('cover') // cover | fields
  const [searched, setSearched] = useState(false)

  const search = async () => {
    setLoading(true)
    setSearched(true)
    try {
      const r = await searchListings({ q, location, listing_type: listingType })
      setResults(r.data.results)
    } catch (e) {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => e.key === 'Enter' && search()

  const openListing = async (item) => {
    setSelected(item)
    setCoverLetter('')
    setFormFields(null)
    setSaved(false)
    setAiLoading(true)
    setTab('cover')
    try {
      const [clRes, ffRes] = await Promise.all([
        generateCoverLetter({
          listing_title: item.title,
          listing_org: item.organization,
          listing_type: item.listing_type,
          listing_description: item.description,
          listing_requirements: item.requirements,
          listing_amount: item.amount,
        }),
        generateFormData({
          listing_title: item.title,
          listing_org: item.organization,
          listing_description: item.description,
        })
      ])
      setCoverLetter(clRes.data.cover_letter)
      setFormFields(ffRes.data.fields)
    } catch (e) {
      setCoverLetter(e.response?.data?.detail?.includes('resume') ? '⚠ Upload a resume first to generate a cover letter.' : 'AI generation failed — check ANTHROPIC_API_KEY.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = async (status = 'saved') => {
    if (!selected) return
    try {
      await saveApplication({
        listing_id: selected.id,
        listing_title: selected.title,
        listing_org: selected.organization,
        listing_url: selected.url,
        listing_type: selected.listing_type,
        cover_letter: coverLetter,
      })
      setSaved(true)
      if (status === 'applied') window.open(selected.url, '_blank')
    } catch (e) { }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Load scholarships on mount
  useEffect(() => {
    getAllScholarships().then(r => { if (listingType === 'scholarship') setResults(r.data.results) }).catch(() => {})
  }, [])

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Left panel */}
      <div className="w-full md:w-[420px] flex flex-col border-r border-gray-800">
        <div className="p-4 space-y-3 border-b border-gray-800">
          <div className="flex gap-2">
            <input
              value={q} onChange={e => setQ(e.target.value)} onKeyDown={handleKey}
              placeholder="Skills, title, keywords..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <button onClick={search} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg">
              <Search size={16} />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={location} onChange={e => setLocation(e.target.value)} onKeyDown={handleKey}
              placeholder="Location (optional)"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <select
              value={listingType} onChange={e => setListingType(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm focus:outline-none"
            >
              <option value="all">All</option>
              <option value="job">Jobs</option>
              <option value="scholarship">Scholarships</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>}
          {!loading && searched && results.length === 0 && (
            <p className="text-center text-gray-500 p-8">No results found. Try different keywords.</p>
          )}
          {!loading && !searched && (
            <div className="text-center text-gray-600 p-8">
              <Search size={32} className="mx-auto mb-2" />
              <p>Search jobs and scholarships above</p>
            </div>
          )}
          {results.map(item => (
            <button
              key={item.id}
              onClick={() => openListing(item)}
              className={`w-full text-left p-4 border-b border-gray-800 hover:bg-gray-900 transition-colors ${selected?.id === item.id ? 'bg-gray-900 border-l-2 border-l-indigo-500' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{item.organization}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${TYPE_COLORS[item.listing_type]}`}>
                      {item.listing_type}
                    </span>
                    {item.location && <span className="text-xs text-gray-500 flex items-center gap-0.5"><MapPin size={10} />{item.location}</span>}
                    {item.amount && <span className="text-xs text-green-400 flex items-center gap-0.5"><DollarSign size={10} />{item.amount}</span>}
                    {item.salary && <span className="text-xs text-green-400">{item.salary}</span>}
                    {item.deadline && <span className="text-xs text-orange-400 flex items-center gap-0.5"><Calendar size={10} />Due: {item.deadline}</span>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="hidden md:flex flex-1 flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <Sparkles size={40} className="mx-auto mb-3" />
              <p>Select a listing to generate your cover letter</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-5 border-b border-gray-800">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                  <p className="text-gray-400 text-sm">{selected.organization} {selected.location && `· ${selected.location}`}</p>
                  {(selected.amount || selected.salary) && (
                    <p className="text-green-400 text-sm mt-0.5">{selected.amount || selected.salary}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <a href={selected.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg">
                    <ExternalLink size={13} /> Open
                  </a>
                  {!saved ? (
                    <button onClick={() => handleSave('saved')}
                      className="flex items-center gap-1.5 text-sm bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg">
                      <BookmarkPlus size={13} /> Save
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm bg-green-800 text-green-200 px-3 py-1.5 rounded-lg">
                      <Check size={13} /> Saved
                    </span>
                  )}
                  <button onClick={() => handleSave('applied')}
                    className="flex items-center gap-1.5 text-sm bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg">
                    Apply & Track
                  </button>
                </div>
              </div>
              {selected.deadline && (
                <p className="text-xs text-orange-400 mt-2">Deadline: {selected.deadline}</p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800">
              <button onClick={() => setTab('cover')} className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'cover' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                Cover Letter
              </button>
              <button onClick={() => setTab('fields')} className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'fields' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                Form Fields
              </button>
              <button onClick={() => setTab('desc')} className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'desc' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                Description
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {aiLoading && (
                <div className="flex items-center gap-2 text-indigo-400 text-sm mb-4">
                  <Loader size={14} className="animate-spin" /> Generating with AI...
                </div>
              )}

              {tab === 'cover' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-300 flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-400" /> AI-Generated Cover Letter</p>
                    {coverLetter && !coverLetter.startsWith('⚠') && (
                      <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200">
                        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <textarea
                    value={coverLetter}
                    onChange={e => setCoverLetter(e.target.value)}
                    rows={18}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                    placeholder={aiLoading ? '' : 'Cover letter will appear here...'}
                  />
                  <p className="text-xs text-gray-600">AI-generated — edit before applying. Click "Apply & Track" to open the application URL and mark as applied.</p>
                </div>
              )}

              {tab === 'fields' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">Pre-filled from your resume. Copy individual fields into the application form.</p>
                  {formFields ? (
                    <div className="space-y-2">
                      {Object.entries(formFields).map(([k, v]) => v && (
                        <div key={k} className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">{k}</p>
                            <p className="text-sm text-gray-200 mt-0.5 truncate">{v}</p>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(v) }}
                            className="text-gray-600 hover:text-gray-300 shrink-0">
                            <Copy size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !aiLoading && <p className="text-gray-500 text-sm">Upload a resume to see pre-filled fields.</p>
                  )}
                </div>
              )}

              {tab === 'desc' && (
                <div className="space-y-3">
                  {selected.requirements && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Requirements</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{selected.requirements}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{selected.description || 'No description available.'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
