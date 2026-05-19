import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, DownloadCloud, Settings, PenSquare } from 'lucide-react';
import './index.css';

// Placeholder Components
import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import CreatePost from './pages/CreatePost';
import AutoScraper from './pages/AutoScraper';
import SettingsPage from './pages/SettingsPage';
import { ToastProvider } from './components/ToastContext';

function App() {
  return (
    <ToastProvider>
      <Router>
      <div className="app-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div style={{ marginBottom: '2rem', padding: '0 0.5rem' }}>
            <h1 className="title-lg text-gradient" style={{ margin: 0 }}>AutoPoster</h1>
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Quản lý nội dung AI</p>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
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
          
          <div style={{ marginTop: 'auto' }}>
            <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Settings size={20} />
              <span>Cài đặt hệ thống</span>
            </NavLink>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/scraper" element={<AutoScraper />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
    </ToastProvider>
  );
}

export default App;
