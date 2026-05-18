import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/authContext'
import { supabase } from '../lib/supabase'
import { LogOut, Bell, Menu, X } from 'lucide-react'
import EastsideFCLogo from './EastsideFC_Logo'
import ColorModeToggle from './ColorModeToggle.jsx'

export default function AdminLayout({ children }) {
  const location = useLocation()
  const { user, profile } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Sign out failed:', error)
    } finally {
      setSigningOut(false)
    }
  }

  const navItems = [
    { path: '/admin', label: 'Dashboard' },
    { path: '/admin/athletes', label: 'Athletes' },
    { path: '/admin/invites', label: 'Invite Codes' },
    { path: '/admin/announcements', label: 'Announcements' },
    { path: '/admin/nil-deals', label: 'NIL Deals' },
    { path: '/admin/camps', label: 'ID Camps' },
  ]

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Top Navigation — editorial bar */}
      <nav
        className="border-b border-card-border sticky top-0 z-30"
        style={{
          background: 'color-mix(in srgb, var(--bg-page) 88%, transparent)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Left — Club crest + identity.
              Crest size bumped 36→48 and wrapped in a soft crimson glow
              + thin crimson ring so it reads as a club emblem, not a
              generic site logo. Keeps the horizontal nav slim while
              still feeling ceremonial. */}
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <div className="relative flex-shrink-0">
              <div
                className="absolute inset-0 -m-1.5 rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, rgba(200,16,46,0.28) 0%, transparent 65%)',
                }}
              />
              <div
                className="relative rounded-xl p-1"
                style={{
                  background: 'color-mix(in srgb, var(--bg-page) 60%, transparent)',
                  border: '1px solid rgba(200,16,46,0.25)',
                }}
              >
                <EastsideFCLogo size={48} />
              </div>
            </div>
            <div className="leading-tight border-l border-card-border pl-3 md:pl-4 min-w-0">
              <div className="display-font text-[14px] md:text-[16px] text-fg-primary tracking-[0.08em] truncate">
                Eastside FC
              </div>
              <div className="text-[9px] text-text-tertiary uppercase tracking-[0.18em] mt-0.5 hidden sm:block">
                Club Admin · 2025–26
              </div>
              <div className="text-[9px] text-text-tertiary uppercase tracking-[0.18em] mt-0.5 sm:hidden">
                Admin
              </div>
            </div>
          </div>

          {/* Center - Navigation Links (desktop only) */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-[13px] font-medium px-3.5 py-2 rounded-md transition-all relative ${
                  isActive(item.path)
                    ? 'text-fg-primary'
                    : 'text-text-secondary hover:text-fg-primary hover:bg-surface-card-hover'
                }`}
                style={
                  isActive(item.path)
                    ? {
                        background: 'linear-gradient(180deg, rgba(200,16,46,0.18) 0%, rgba(200,16,46,0.04) 100%)',
                        boxShadow: 'inset 0 -2px 0 0 var(--crimson)'
                      }
                    : undefined
                }
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right (desktop) - Color mode, Notifications, Admin Info & Sign Out */}
          <div className="hidden md:flex items-center gap-3">
            {/* Themed for the admin top bar — the layout pill from
                AthleteLayout's sidebar would be too wide here, but the
                same ColorModeToggle component cycles Light/Dark/Auto. */}
            <div className="hidden md:block">
              <ColorModeToggle />
            </div>

            <button
              className="relative w-9 h-9 rounded-lg hover:bg-surface-card-hover flex items-center justify-center text-text-secondary hover:text-fg-primary transition-colors"
              aria-label="Notifications"
            >
              <Bell size={17} />
              <span
                className="absolute top-2 right-2 w-2 h-2 rounded-full"
                style={{ background: 'var(--crimson)' }}
              />
            </button>

            <div className="text-right hidden lg:block">
              <div className="text-fg-primary text-[13px] font-semibold leading-tight truncate max-w-[180px]">
                {profile?.full_name || 'Admin'}
              </div>
              <div className="text-text-tertiary text-[11px] leading-tight truncate max-w-[180px]">{user?.email}</div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-2 px-3 py-1.5 text-text-secondary text-[12px] border border-card-border rounded-md hover:border-eastside-crimson hover:text-fg-primary transition-colors disabled:opacity-50"
            >
              <LogOut size={13} />
              <span className="hidden lg:inline">{signingOut ? 'Signing out…' : 'Sign Out'}</span>
            </button>
          </div>

          {/* Right (mobile) - Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-lg hover:bg-surface-card-hover flex items-center justify-center text-fg-primary"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile drawer (slides down below the top bar) */}
        {mobileMenuOpen && (
          <div
            className="md:hidden border-t border-card-border"
            style={{ background: 'color-mix(in srgb, var(--bg-page) 96%, transparent)' }}
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block text-[14px] font-medium px-3 py-2.5 rounded-md ${
                    isActive(item.path)
                      ? 'text-fg-primary'
                      : 'text-text-secondary hover:text-fg-primary hover:bg-surface-card-hover'
                  }`}
                  style={
                    isActive(item.path)
                      ? {
                          background: 'linear-gradient(90deg, rgba(200,16,46,0.18) 0%, rgba(200,16,46,0.04) 100%)',
                          borderLeft: '2px solid var(--crimson)'
                        }
                      : undefined
                  }
                >
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-card-border pt-3 mt-3">
                <div className="px-3 mb-2">
                  <div className="text-fg-primary text-[13px] font-semibold leading-tight truncate">
                    {profile?.full_name || 'Admin'}
                  </div>
                  <div className="text-text-tertiary text-[11px] leading-tight truncate">{user?.email}</div>
                </div>
                <div className="px-3 mb-2">
                  <ColorModeToggle />
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleSignOut()
                  }}
                  disabled={signingOut}
                  className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-text-secondary text-[13px] hover:text-fg-primary hover:bg-surface-card-hover rounded-md transition-colors disabled:opacity-50"
                >
                  <LogOut size={14} />
                  {signingOut ? 'Signing out…' : 'Sign Out'}
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">{children}</main>
    </div>
  )
}