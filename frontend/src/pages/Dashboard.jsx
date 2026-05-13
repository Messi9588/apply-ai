import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStats, getResume } from '../api/client'
import { Briefcase, GraduationCap, CheckCircle, Clock, XCircle, TrendingUp, ArrowRight } from 'lucide-react'

const statusColors = {
  saved: 'bg-gray-700 text-gray-200',
  applied: 'bg-blue-700 text-blue-100',
  interview: 'bg-yellow-700 text-yellow-100',
  rejected: 'bg-red-800 text-red-100',
  accepted: 'bg-green-700 text-green-100',
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [resume, setResume] = useState(null)

  useEffect(() => {
    getStats().then(r => setStats(r.data)).catch(() => {})
    getResume().then(r => setResume(r.data)).catch(() => {})
  }, [])

  const s = stats || { total: 0, by_status: {}, jobs: 0, scholarships: 0 }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {!resume && (
        <div className="bg-indigo-900/40 border border-indigo-700 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-indigo-200">Get started — upload your resume</p>
            <p className="text-sm text-indigo-400 mt-0.5">AI will parse it and auto-fill applications + write tailored cover letters.</p>
          </div>
          <Link to="/resume" className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Upload Resume <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {resume && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Active Resume</p>
            <p className="font-semibold text-white">{resume.parsed?.name || resume.filename}</p>
            {resume.parsed?.education?.[0] && (
              <p className="text-sm text-gray-400">{resume.parsed.education[0].degree} · {resume.parsed.education[0].institution}</p>
            )}
          </div>
          <Link to="/resume" className="text-sm text-indigo-400 hover:text-indigo-300">Update →</Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: s.total, icon: TrendingUp, color: 'indigo' },
          { label: 'Applied', value: s.by_status.applied || 0, icon: Clock, color: 'blue' },
          { label: 'Interviews', value: s.by_status.interview || 0, icon: CheckCircle, color: 'yellow' },
          { label: 'Accepted', value: s.by_status.accepted || 0, icon: CheckCircle, color: 'green' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`text-3xl font-bold text-${color}-400 mt-1`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold text-gray-200 mb-4">By Type</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-300"><Briefcase size={15} /> Jobs</span>
              <span className="font-bold text-white">{s.jobs}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-300"><GraduationCap size={15} /> Scholarships</span>
              <span className="font-bold text-white">{s.scholarships}</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold text-gray-200 mb-4">Status Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(s.by_status).map(([status, count]) => count > 0 && (
              <div key={status} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[status] || 'bg-gray-700'}`}>{status}</span>
                <span className="font-medium text-white">{count}</span>
              </div>
            ))}
            {s.total === 0 && <p className="text-sm text-gray-500">No applications yet — start searching!</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Link to="/search" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl p-4 text-center font-medium">
          Search Jobs & Scholarships
        </Link>
        <Link to="/tracker" className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl p-4 text-center font-medium">
          View Tracker
        </Link>
      </div>
    </div>
  )
}
