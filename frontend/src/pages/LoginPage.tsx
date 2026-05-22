import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Google Client ID - sẽ được inject từ env hoặc meta tag
const GOOGLE_CLIENT_ID = (window as any).__GOOGLE_CLIENT_ID__ || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google: any;
    __GOOGLE_CLIENT_ID__: string;
  }
}

export default function LoginPage() {
  const { user, loading, loginWithToken } = useAuth();
  const [error, setError] = useState('');
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // Load Google Identity Services script
  useEffect(() => {
    if (window.google) { setGsiLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Init Google Sign-In button sau khi script loaded
  useEffect(() => {
    if (!gsiLoaded || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCallback,
      context: 'signin',
    });
    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-btn'),
      {
        theme: 'filled_black',
        size: 'large',
        width: 320,
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
      }
    );
  }, [gsiLoaded]);

  const handleGoogleCallback = async (response: { credential: string }) => {
    setSigningIn(true);
    setError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Đăng nhập thất bại');
        return;
      }
      loginWithToken(data.access_token, data.user);
    } catch {
      setError('Không thể kết nối đến server. Vui lòng thử lại.');
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      backgroundImage: `
        radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.12) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.10) 0%, transparent 50%)
      `,
      padding: '1rem',
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: 'fixed', top: '-200px', right: '-200px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-200px', left: '-200px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Login Card */}
      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '3rem 2.5rem',
        textAlign: 'center',
        position: 'relative',
        border: '1px solid rgba(99,102,241,0.2)',
      }}>
        {/* Logo / App Icon */}
        <div style={{
          width: '72px', height: '72px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
          fontSize: '2rem',
        }}>
          🤖
        </div>

        <h1 style={{
          fontSize: '1.75rem', fontWeight: '700',
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          AutoPoster
        </h1>
        <p className="text-secondary" style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>
          Hệ thống quản lý nội dung AI
        </p>
        <p className="text-secondary" style={{ marginBottom: '2.5rem', fontSize: '0.85rem' }}>
          Đăng nhập bằng tài khoản Google được cấp quyền
        </p>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: 'var(--border-color)',
          marginBottom: '2rem',
        }} />

        {/* Error message */}
        {error && (
          <div style={{
            padding: '0.875rem 1rem',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            color: 'var(--error)',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            textAlign: 'left',
            lineHeight: '1.5',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Google Sign-In Button */}
        <div style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }}>
          {signingIn ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              color: 'var(--text-secondary)', fontSize: '0.9rem',
            }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.2)',
                borderTopColor: 'var(--accent-primary)',
                animation: 'spin 0.8s linear infinite',
              }} />
              Đang xác thực...
            </div>
          ) : (
            <div id="google-signin-btn" />
          )}
        </div>

        {!gsiLoaded && !signingIn && (
          <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '1rem' }}>
            Đang tải Google Sign-In...
          </p>
        )}

        {/* Footer note */}
        <p className="text-secondary" style={{
          fontSize: '0.78rem', marginTop: '2rem',
          lineHeight: '1.6',
        }}>
          Chỉ tài khoản được Admin phê duyệt mới có thể đăng nhập.
          <br />
          Liên hệ <span style={{ color: 'var(--accent-primary)' }}>tuanminh9218@gmail.com</span> để được cấp quyền.
        </p>
      </div>
    </div>
  );
}
