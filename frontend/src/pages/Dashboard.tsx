import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Activity, CheckCircle2, FileText, Clock, Server } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_posts: 0,
    published_posts: 0,
    pending_posts: 0,
    active_sources: 0,
    upcoming_posts: [] as any[],
    active_sources_list: [] as string[]
  });

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Error fetching stats:", err));
  }, []);
  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="title-xl">Tổng quan Hệ thống</h1>
        <p className="text-secondary">Theo dõi hiệu suất nội dung và xu hướng bài viết của bạn.</p>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 className="text-secondary" style={{ fontSize: '0.9rem' }}>Tổng số bài</h3>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
              <FileText size={20} color="var(--accent-primary)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total_posts}</p>
          <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--success)' }}>Bài viết đã được cào</p>
        </div>
        
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 className="text-secondary" style={{ fontSize: '0.9rem' }}>Đã xuất bản</h3>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
              <CheckCircle2 size={20} color="var(--success)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.published_posts}</p>
          <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Đăng thành công lên website</p>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 className="text-secondary" style={{ fontSize: '0.9rem' }}>Chờ xử lý</h3>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
              <Clock size={20} color="var(--warning)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.pending_posts}</p>
          <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--warning)' }}>Đang chờ duyệt hoặc lên lịch</p>
        </div>
        
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 className="text-secondary" style={{ fontSize: '0.9rem' }}>Nguồn cào tự động</h3>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
              <Server size={20} color="var(--accent-secondary)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.active_sources}</p>
          <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Nguồn đang hoạt động</p>
        </div>
      </div>

      <div className="grid grid-cols-2">
        <div className="glass-card">
          <h3 className="title-lg" style={{ fontSize: '1.2rem' }}>Nguồn cào đang hoạt động</h3>
          <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>Các nguồn đang cào tự động 24/7</p>
          
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stats.active_sources_list.length > 0 ? stats.active_sources_list.map((topic, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: '500' }}>{topic}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Đang chạy</span>
              </li>
            )) : <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Chưa có nguồn nào đang chạy.</p>}
          </ul>
        </div>
        
        <div className="glass-card">
          <h3 className="title-lg" style={{ fontSize: '1.2rem' }}>Bài viết sắp đăng</h3>
          <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>Đã lên lịch trong tương lai</p>
          
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stats.upcoming_posts.length > 0 ? stats.upcoming_posts.map((item, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ flex: 1, paddingRight: '1rem' }}>
                  <div style={{ fontWeight: '500', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{item.title}</div>
                  <div className="text-secondary" style={{ fontSize: '0.8rem' }}>
                    {new Date(item.scheduled_time).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
                <span className={`badge success`}>{item.status}</span>
              </li>
            )) : <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Không có bài viết nào sắp đăng.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
