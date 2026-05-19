import { useState } from 'react';

export default function SettingsPage() {
  const [wpUrl, setWpUrl] = useState('https://mpuh.vn');
  const [wpUsername, setWpUsername] = useState('autoposter');
  const [wpPassword, setWpPassword] = useState('123456');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="title-xl">Cài đặt Hệ thống</h1>
        <p className="text-secondary">Cấu hình kết nối WordPress, API Keys và xử lý hình ảnh.</p>
      </header>

      <div className="grid grid-cols-2">
        <div className="glass-card">
          <h3 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Trang web đích (WordPress)</h3>
          
          <div className="form-group">
            <label className="form-label">URL Website</label>
            <input 
              type="url" 
              className="form-input" 
              value={wpUrl}
              onChange={(e) => setWpUrl(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Tài khoản (Username)</label>
            <input 
              type="text" 
              className="form-input" 
              value={wpUsername}
              onChange={(e) => setWpUsername(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Mật khẩu (Application Password)</label>
            <input 
              type="password" 
              className="form-input" 
              value={wpPassword}
              onChange={(e) => setWpPassword(e.target.value)}
            />
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--warning)' }}>
              Lưu ý: API của WordPress yêu cầu "Mật khẩu Ứng dụng" (Application Password) được tạo trong phần Hồ sơ người dùng (Profile), KHÔNG phải mật khẩu đăng nhập thông thường, trừ khi bạn cài đặt plugin Basic-Auth.
            </p>
          </div>

          <button className="btn btn-primary">Kiểm tra kết nối & Lưu</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <h3 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Cấu hình AI API</h3>
            
            <div className="form-group">
              <label className="form-label">Google Gemini API Key</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="AIzaSy..." 
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
              <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Dùng để AI viết lại bài và tạo thẻ tags thông minh.</p>
            </div>
            
            <button className="btn btn-secondary">Lưu API Key</button>
          </div>

          <div className="glass-card">
            <h3 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Xử lý Hình ảnh</h3>
            
            <div className="form-group">
              <label className="form-label">Chữ Watermark</label>
              <input type="text" className="form-input" defaultValue="mpuh.vn" />
            </div>
            
            <div className="form-group">
              <label className="form-label">Vị trí Watermark</label>
              <select className="form-select">
                <option>Góc dưới cùng Bên phải</option>
                <option>Góc dưới cùng Bên trái</option>
                <option>Chính giữa</option>
              </select>
            </div>
            
            <button className="btn btn-secondary">Lưu Cấu hình Ảnh</button>
          </div>
        </div>
      </div>
    </div>
  );
}
