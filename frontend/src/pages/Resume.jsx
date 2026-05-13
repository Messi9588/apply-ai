import React, { useState, useEffect, useRef } from 'react'
import { uploadResume, getResume, deleteResume } from '../api/client'
import { Upload, Trash2, User, GraduationCap, Briefcase, Code, Award } from 'lucide-react'

export default function Resume() {
  const [resume, setResume] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  useEffect(() => {
    getResume().then(r => setResume(r.data)).catch(() => {})
  }, [])

  const handleFile = async (file) => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const r = await uploadResume(file)
      setResume({ filename: r.data.filename, parsed: r.data.parsed })
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleDelete = async () => {
    if (!confirm('Remove resume?')) return
    await deleteResume()
    setResume(null)
  }

  const p = resume?.parsed || {}

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Resume</h1>

      {!resume ? (
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragging ? 'border-indigo-400 bg-indigo-900/20' : 'border-gray-700 hover:border-gray-500'}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          <Upload className="mx-auto mb-3 text-gray-500" size={36} />
          <p className="text-gray-300 font-medium">{loading ? 'Parsing with AI...' : 'Drop your resume here or click to upload'}</p>
          <p className="text-sm text-gray-500 mt-1">PDF or DOCX · AI extracts your profile automatically</p>
          {loading && <div className="mt-4 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>}
          {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <User size={18} />
              </div>
              <div>
                <p className="font-semibold text-white">{p.name || 'Unknown'}</p>
                <p className="text-sm text-gray-400">{resume.filename}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setResume(null) }} className="text-sm text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-800 hover:bg-indigo-900/30">
                Replace
              </button>
              <button onClick={handleDelete} className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-900 hover:bg-red-900/20">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {p.name && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Email', p.email], ['Phone', p.phone], ['Location', p.location], ['GPA', p.gpa || p.education?.[0]?.gpa]].map(([k, v]) => v && (
                <div key={k} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">{k}</p>
                  <p className="text-gray-200 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          )}

          {p.education?.length > 0 && (
            <Section icon={GraduationCap} title="Education">
              {p.education.map((e, i) => (
                <div key={i} className="border-l-2 border-indigo-700 pl-3">
                  <p className="font-medium text-gray-200">{e.degree} {e.field && `in ${e.field}`}</p>
                  <p className="text-sm text-gray-400">{e.institution} {e.year && `· ${e.year}`} {e.gpa && `· GPA ${e.gpa}`}</p>
                </div>
              ))}
            </Section>
          )}

          {p.experience?.length > 0 && (
            <Section icon={Briefcase} title="Experience">
              {p.experience.map((e, i) => (
                <div key={i} className="border-l-2 border-blue-700 pl-3">
                  <p className="font-medium text-gray-200">{e.title} <span className="text-gray-400">@ {e.company}</span></p>
                  {e.duration && <p className="text-xs text-gray-500">{e.duration}</p>}
                  {e.bullets?.slice(0, 2).map((b, j) => <p key={j} className="text-sm text-gray-400 mt-0.5">• {b}</p>)}
                </div>
              ))}
            </Section>
          )}

          {p.skills?.length > 0 && (
            <Section icon={Code} title="Skills">
              <div className="flex flex-wrap gap-2">
                {p.skills.map(s => (
                  <span key={s} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </Section>
          )}

          {p.awards?.length > 0 && (
            <Section icon={Award} title="Awards & Certifications">
              <div className="flex flex-wrap gap-2">
                {[...(p.awards || []), ...(p.certifications || [])].map(a => (
                  <span key={a} className="bg-yellow-900/40 text-yellow-300 text-xs px-2 py-1 rounded-full">{a}</span>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="flex items-center gap-2 font-semibold text-gray-200 mb-3"><Icon size={16} className="text-indigo-400" /> {title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
