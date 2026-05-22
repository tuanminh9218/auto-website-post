import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, FileText, DownloadCloud, Settings, PenSquare, LogOut, Users } from 'lucide-react';
import './index.css';

import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import CreatePost from './pages/CreatePost';
import AutoScraper from './pages/AutoScraper';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppLayout() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ marginBottom: '2rem', padding: '0 0.5rem' }}>
          <h1 className="title-lg text-gradient" style={{ margin: 0 }}>AutoPoster</h1>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Quản lý nội dung AI</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Tổng quan</span>
          </NavLink>
          <NavLink to="/posts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileText size={20} />
            <span>Tất cả bài viết</span>
          </NavLink>
          <NavLink to="/create" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <PenSquare size={20} />
            <span>Tạo bài viết</span>
          </NavLink>
          <NavLink to="/scraper" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <DownloadCloud size={20} />
            <span>Cào dữ liệu (Auto Scraper)</span>
          </NavLink>
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Cài đặt hệ thống</span>
          </NavLink>

          {/* User Info */}
          {user && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.875rem',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--border-color)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', fontWeight: '700',
                  }}>
                    {user.name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name || user.email}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                    {isAdmin ? (
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(99,102,241,0.2)', color: 'var(--accent-primary)', borderRadius: '99px' }}>
                        👑 Admin
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.role}</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.4rem', padding: '0.4rem', background: 'transparent',
                  border: '1px solid var(--border-color)', borderRadius: '8px',
                  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.4)'; (e.currentTarget as HTMLElement).style.color = 'var(--error)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
              >
                <LogOut size={14} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/scraper" element={<AutoScraper />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
