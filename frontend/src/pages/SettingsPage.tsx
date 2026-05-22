import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, RefreshCw, Eye, EyeOff, Users, Shield, Trash2, CheckSquare, XSquare } from 'lucide-react';
import { useAuth, useAuthFetch } from '../contexts/AuthContext';

interface SettingsState {
  wp_url: string;
  wp_username: string;
  wp_app_password: string;
  gemini_api_key: string;
  watermark_text: string;
}

interface UserRecord {
  id: number;
  email: string;
  name: string;
  avatar_url: string;
  role: 'admin' | 'editor' | 'viewer';
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

type Tab = 'system' | 'accounts';

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const authFetch = useAuthFetch();
  const [activeTab, setActiveTab] = useState<Tab>('system');

  // System settings state
  const [settings, setSettings] = useState<SettingsState>({
    wp_url: '', wp_username: '', wp_app_password: '',
    gemini_api_key: '', watermark_text: 'mpuh.vn',
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showWpPass, setShowWpPass] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Account management state
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    authFetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSettings({
          wp_url: data.wp_url || '',
          wp_username: data.wp_username || '',
          wp_app_password: data.wp_app_password === '***' ? '' : (data.wp_app_password || ''),
          gemini_api_key: data.gemini_api_key === '***' ? '' : (data.gemini_api_key || ''),
          watermark_text: data.watermark_text || 'mpuh.vn',
        });
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false));
  }, []);

  const fetchUsers = () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    authFetch('/api/admin/users')
      .then(r => r.json())
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  };

  useEffect(() => {
    if (activeTab === 'accounts') fetchUsers();
  }, [activeTab]);

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload: Partial<SettingsState> = { ...settings };
      if (!payload.wp_app_password) delete payload.wp_app_password;
      if (!payload.gemini_api_key) delete payload.gemini_api_key;
      const res = await authFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setMessage(res.ok
        ? { type: 'success', text: data.message || 'Đã lưu cấu hình!' }
        : { type: 'error', text: data.detail || 'Lỗi khi lưu.' });
    } catch {
      setMessage({ type: 'error', text: 'Không thể kết nối server.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleUpdateUser = async (userId: number, role: string, is_active: boolean) => {
    setUpdatingId(userId);
    try {
      const res = await authFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role, is_active }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (!confirm(`Xóa tài khoản "${email}"?`)) return;
    setUpdatingId(userId);
    try {
      const res = await authFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) setUsers(prev => prev.filter(u => u.id !== userId));
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Chưa đăng nhập';

  const roleColors: Record<string, string> = {
    admin: 'rgba(99,102,241,0.2)',
    editor: 'rgba(16,185,129,0.15)',
    viewer: 'rgba(255,255,255,0.05)',
  };
  const roleTextColors: Record<string, string> = {
    admin: 'var(--accent-primary)',
    editor: 'var(--success)',
    viewer: 'var(--text-muted)',
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="title-xl">Cài đặt Hệ thống</h1>
          <p className="text-secondary">Cấu hình WordPress, API Keys, và quản lý tài khoản.</p>
        </div>
        {activeTab === 'system' && (
          <button className="btn btn-primary" onClick={handleSaveAll} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {saving ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang lưu...</>
              : <><Save size={16} /> Lưu tất cả</>}
          </button>
        )}
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
        {[
          { id: 'system' as Tab, label: '⚙️ Cấu hình hệ thống', always: true },
          { id: 'accounts' as Tab, label: '👥 Quản lý tài khoản', always: false },
        ].filter(t => t.always || isAdmin).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '0.65rem 1.25rem', border: 'none', cursor: 'pointer',
            background: 'transparent', fontWeight: activeTab === tab.id ? '600' : '400',
            color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
            fontSize: '0.9rem', transition: 'all 0.2s', marginBottom: '-1px',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toast */}
      {message && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem',
          background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: message.type === 'success' ? 'var(--success)' : 'var(--error)',
        }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── TAB: SYSTEM SETTINGS ── */}
      {activeTab === 'system' && (
        loadingSettings ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', opacity: 0.4 }} />
          </div>
        ) : (
          <div className="grid grid-cols-2">
            {/* WordPress */}
            <div className="glass-card">
              <h3 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>🌐 Trang web đích (WordPress)</h3>
              <div className="form-group">
                <label className="form-label">URL Website</label>
                <input type="url" className="form-input" placeholder="https://mpuh.vn"
                  value={settings.wp_url} onChange={e => setSettings({ ...settings, wp_url: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Tài khoản (Username)</label>
                <input type="text" className="form-input" placeholder="autoposter"
                  value={settings.wp_username} onChange={e => setSettings({ ...settings, wp_username: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu (Application Password)</label>
                <div style={{ position: 'relative' }}>
                  <input type={showWpPass ? 'text' : 'password'} className="form-input"
                    placeholder="Nhập để thay đổi..." style={{ paddingRight: '2.75rem' }}
                    value={settings.wp_app_password} onChange={e => setSettings({ ...settings, wp_app_password: e.target.value })} />
                  <button onClick={() => setShowWpPass(!showWpPass)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    {showWpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--warning)' }}>
                  ⚠️ Dùng "Application Password" từ Profile WordPress.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Gemini API */}
              <div className="glass-card">
                <h3 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>🤖 Cấu hình AI API</h3>
                <div className="form-group">
                  <label className="form-label">Google Gemini API Key</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showApiKey ? 'text' : 'password'} className="form-input"
                      placeholder="AIzaSy... (nhập để thay đổi)" style={{ paddingRight: '2.75rem' }}
                      value={settings.gemini_api_key} onChange={e => setSettings({ ...settings, gemini_api_key: e.target.value })} />
                    <button onClick={() => setShowApiKey(!showApiKey)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    Dùng để AI viết lại bài và tạo tags. Lấy tại{' '}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>Google AI Studio</a>.
                  </p>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  ✅ API Key hiện tại đã được cấu hình. Nhập mới để ghi đè.
                </div>
              </div>
              {/* Image */}
              <div className="glass-card">
                <h3 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>🖼️ Xử lý Hình ảnh</h3>
                <div className="form-group">
                  <label className="form-label">Chữ Watermark</label>
                  <input type="text" className="form-input" placeholder="mpuh.vn"
                    value={settings.watermark_text} onChange={e => setSettings({ ...settings, watermark_text: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Vị trí Watermark</label>
                  <select className="form-select">
                    <option>Góc dưới cùng Bên phải</option>
                    <option>Góc dưới cùng Bên trái</option>
                    <option>Chính giữa</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* ── TAB: ACCOUNT MANAGEMENT ── */}
      {activeTab === 'accounts' && isAdmin && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="title-lg" style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="var(--accent-primary)" /> Danh sách tài khoản
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({users.length} tài khoản)</span>
            </h3>
            <button className="btn btn-secondary" onClick={fetchUsers} disabled={loadingUsers} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <RefreshCw size={14} style={loadingUsers ? { animation: 'spin 1s linear infinite' } : {}} />
              Làm mới
            </button>
          </div>

          {/* Info box */}
          <div style={{ padding: '0.875rem 1rem', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Shield size={14} style={{ display: 'inline', marginRight: '0.4rem', color: 'var(--accent-primary)' }} />
            Người dùng mới đăng nhập lần đầu sẽ có trạng thái <strong>Chờ duyệt</strong>. Admin cần <strong>Approve</strong> để họ có thể sử dụng.
          </div>

          {loadingUsers ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', opacity: 0.4 }} />
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Users size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <p>Chưa có tài khoản nào.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {users.map(u => (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.25rem',
                  background: u.is_active ? 'rgba(255,255,255,0.02)' : 'rgba(239,68,68,0.03)',
                  border: `1px solid ${u.is_active ? 'var(--border-color)' : 'rgba(239,68,68,0.15)'}`,
                  borderRadius: 'var(--border-radius-md)',
                  opacity: updatingId === u.id ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}>
                  {/* Avatar */}
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.name} style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0 }}>
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || u.email}</div>
                    <div className="text-secondary" style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Đăng nhập lần cuối: {formatDate(u.last_login_at)}
                    </div>
                  </div>

                  {/* Role badge */}
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '600', background: roleColors[u.role], color: roleTextColors[u.role], flexShrink: 0 }}>
                    {u.role === 'admin' ? '👑 ' : u.role === 'editor' ? '✏️ ' : '👁️ '}
                    {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                  </span>

                  {/* Status */}
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '600', background: u.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: u.is_active ? 'var(--success)' : 'var(--error)', flexShrink: 0 }}>
                    {u.is_active ? '● Hoạt động' : '◉ Chờ duyệt'}
                  </span>

                  {/* Actions — không cho sửa admin chính */}
                  {u.email !== 'tuanminh9218@gmail.com' && (
                    <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                      {/* Role select */}
                      <select
                        value={u.role}
                        onChange={e => handleUpdateUser(u.id, e.target.value, u.is_active)}
                        disabled={!!updatingId}
                        className="form-select"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem', minWidth: '90px' }}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>

                      {/* Approve / Revoke */}
                      <button
                        onClick={() => handleUpdateUser(u.id, u.role, !u.is_active)}
                        disabled={!!updatingId}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: u.is_active ? 'var(--error)' : 'var(--success)' }}
                        title={u.is_active ? 'Thu hồi quyền' : 'Phê duyệt'}
                      >
                        {u.is_active ? <XSquare size={14} /> : <CheckSquare size={14} />}
                        {u.is_active ? 'Thu hồi' : 'Duyệt'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        disabled={!!updatingId}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', color: 'var(--error)' }}
                        title="Xóa tài khoản"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {u.email === 'tuanminh9218@gmail.com' && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', padding: '0.35rem 0.75rem' }}>
                      👑 Chủ sở hữu
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
