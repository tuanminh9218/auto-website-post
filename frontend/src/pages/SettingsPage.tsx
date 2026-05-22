import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface SettingsState {
  wp_url: string;
  wp_username: string;
  wp_app_password: string;
  gemini_api_key: string;
  watermark_text: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    wp_url: '',
    wp_username: '',
    wp_app_password: '',
    gemini_api_key: '',
    watermark_text: 'mpuh.vn',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showWpPass, setShowWpPass] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Load current settings from backend
  useEffect(() => {
    fetch('/api/settings')
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
      .finally(() => setLoading(false));
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Only send non-empty values (don't overwrite with empty)
      const payload: Partial<SettingsState> = { ...settings };
      if (!payload.wp_app_password) delete payload.wp_app_password;
      if (!payload.gemini_api_key) delete payload.gemini_api_key;

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Đã lưu cấu hình thành công!' });
      } else {
        setMessage({ type: 'error', text: data.detail || 'Lỗi khi lưu cấu hình.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Không thể kết nối đến server.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', opacity: 0.5 }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="title-xl">Cài đặt Hệ thống</h1>
          <p className="text-secondary">Cấu hình kết nối WordPress, API Keys và xử lý hình ảnh.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSaveAll}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {saving
            ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang lưu...</>
            : <><Save size={16} /> Lưu tất cả</>
          }
        </button>
      </header>

      {/* Toast message */}
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

      <div className="grid grid-cols-2">
        {/* WordPress Settings */}
        <div className="glass-card">
          <h3 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
            🌐 Trang web đích (WordPress)
          </h3>

          <div className="form-group">
            <label className="form-label">URL Website</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://mpuh.vn"
              value={settings.wp_url}
              onChange={(e) => setSettings({ ...settings, wp_url: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tài khoản (Username)</label>
            <input
              type="text"
              className="form-input"
              placeholder="autoposter"
              value={settings.wp_username}
              onChange={(e) => setSettings({ ...settings, wp_username: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu (Application Password)</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showWpPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Nhập mật khẩu mới để thay đổi..."
                value={settings.wp_app_password}
                onChange={(e) => setSettings({ ...settings, wp_app_password: e.target.value })}
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                onClick={() => setShowWpPass(!showWpPass)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                {showWpPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--warning)' }}>
              ⚠️ Dùng "Application Password" được tạo trong Profile WordPress, không phải mật khẩu đăng nhập thông thường.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Gemini API */}
          <div className="glass-card">
            <h3 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
              🤖 Cấu hình AI API
            </h3>

            <div className="form-group">
              <label className="form-label">Google Gemini API Key</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="form-input"
                  placeholder="AIzaSy... (nhập để thay đổi)"
                  value={settings.gemini_api_key}
                  onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Dùng để AI viết lại bài và tạo tags thông minh. Lấy key tại{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>
                  Google AI Studio
                </a>.
              </p>
            </div>

            <div style={{
              padding: '0.75rem', borderRadius: '8px',
              background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)',
              fontSize: '0.85rem', color: 'var(--text-secondary)'
            }}>
              ✅ API Key hiện tại đã được cấu hình qua Cloud Run environment variable.
              Nhập key mới ở đây chỉ để ghi đè.
            </div>
          </div>

          {/* Image Processing */}
          <div className="glass-card">
            <h3 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
              🖼️ Xử lý Hình ảnh
            </h3>

            <div className="form-group">
              <label className="form-label">Chữ Watermark</label>
              <input
                type="text"
                className="form-input"
                placeholder="mpuh.vn"
                value={settings.watermark_text}
                onChange={(e) => setSettings({ ...settings, watermark_text: e.target.value })}
              />
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
    </div>
  );
}
