import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, Search, BookmarkCheck, Sparkles } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/resume', icon: FileText, label: 'Resume' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/tracker', icon: BookmarkCheck, label: 'Tracker' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
      <Link to="/" className="flex items-center gap-2 text-indigo-400 font-bold text-lg mr-4">
        <Sparkles size={20} /> ApplyAI
      </Link>
      {links.map(({ to, icon: Icon, label }) => (
        <Link
          key={to}
          to={to}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${
            pathname === to
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Icon size={15} /> {label}
        </Link>
      ))}
    </nav>
  )
}
