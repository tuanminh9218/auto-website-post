import { useState, useEffect, useRef } from 'react';
import { Send, Edit, Trash2, Clock, MapPin, X, RefreshCw, Globe, Code, Eye } from 'lucide-react';
import { useToast } from '../components/ToastContext';

const DOMAIN_NAMES: Record<string, string> = {
  'dantri.com.vn': 'Dân Trí',
  'suckhoedoisong.vn': 'Sức Khỏe Đời Sống',
  'baoyte.com': 'Báo Y Tế',
  'tuoitre.vn': 'Tuổi Trẻ',
  'vnexpress.net': 'VnExpress',
  'baomoi.com': 'Báo Mới',
  'nhandan.vn': 'Nhân Dân',
  'suckhoevadoisong.vn': 'Sức Khỏe & Đời Sống',
  'tienphong.vn': 'Tiền Phong',
  'vietnamnet.vn': 'VietnamNet',
};

const getSourceName = (url: string | null) => {
  if (!url) return 'Không rõ nguồn';
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return DOMAIN_NAMES[domain] || domain;
  } catch (e) {
    return 'Nguồn tùy chỉnh';
  }
};

const CATEGORY_SLUGS: Record<string, string> = {
  'Tin tức sự kiện': 'tin-tuc',
  'Y học thường thức': 'y-hoc-thuong-thuc',
  'Hoạt động chuyên môn': 'hoat-dong-chuyen-mon',
  'Văn bản công bố': 'van-ban-cong-bo',
  'Nghiên cứu khoa học': 'nghien-cuu-khoa-hoc'
};

const generatePostUrl = (title: string, location: string, sourceUrl: string) => {
  const catSlug = CATEGORY_SLUGS[location] || 'tin-tuc';
  
  // Ưu tiên lấy slug chính xác từ URL gốc (vì có chứa ID/Timestamp của bài viết)
  if (sourceUrl && sourceUrl.startsWith('http')) {
    try {
      const urlObj = new URL(sourceUrl);
      const paths = urlObj.pathname.split('/').filter(Boolean);
      let lastPath = paths[paths.length - 1];
      if (lastPath) {
        lastPath = lastPath.replace(/\.html?$/, ''); // Bỏ đuôi .htm, .html
        return `https://mpuh.vn/${catSlug}/${lastPath}`;
      }
    } catch (e) {
      // fallback if invalid url
    }
  }

  // Fallback: Tạo slug từ title nếu không có source_url hợp lệ
  if (!title) return `https://mpuh.vn/${catSlug}`;
  const slug = title.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `https://mpuh.vn/${catSlug}/${slug}`;
};

export default function Posts() {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [contentViewMode, setContentViewMode] = useState<'html' | 'preview'>('html');
  const [liveContent, setLiveContent] = useState('');
  const { showToast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      setPosts(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleEditClick = (post: any) => {
    setEditingPost(post);
    setLiveContent(post.content || '');
    setContentViewMode('html');
    setShowEditModal(true);
  };

  const handlePublishNow = async (id: number) => {
    showToast(`Đang tiến hành đăng bài (ID: ${id}). Trình duyệt ảo đang chạy...`, 'info');
    setPosts(posts.map(p => p.id === id ? { ...p, status: 'publishing' } : p));
    try {
        await fetch(`/api/posts/${id}/publish`, { method: 'POST' });
        fetchPosts();
        showToast("Đăng bài thành công!", 'success');
    } catch(e) {
        console.error(e);
        showToast("Có lỗi xảy ra khi đăng bài.", 'error');
        fetchPosts();
    }
  };

  const handleRetry = async (id: number) => {
    if (!confirm(`Đăng lại bài ID: ${id}?`)) return;
    setPosts(posts.map(p => p.id === id ? { ...p, status: 'publishing' } : p));
    try {
      const res = await fetch(`/api/posts/${id}/publish`, { method: 'POST' });
      if (res.ok) {
        showToast('✅ Đăng lại thành công!', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`❌ Đăng lại thất bại: ${err.detail || 'Lỗi không xác định'}`, 'error');
      }
    } catch (e) {
      showToast('❌ Lỗi kết nối, không thể đăng lại.', 'error');
    } finally {
      fetchPosts();
    }
  };

  const handleDelete = async (id: number) => {
    if(confirm("Bạn có chắc muốn xóa bài này?")) {
        await fetch(`/api/posts/${id}`, { method: 'DELETE' });
        fetchPosts();
    }
  };

  const handleSaveEdit = async () => {
      const title = (document.getElementById('edit_title') as HTMLInputElement).value;
      const location = (document.getElementById('edit_location') as HTMLSelectElement).value;
      const scheduledTime = (document.getElementById('edit_time') as HTMLInputElement).value;
      // Lấy nội dung từ state (đã được đồng bộ realtime từ textarea)
      const content = liveContent;
      
      setIsSavingEdit(true);
      try {
          const res = await fetch(`/api/posts/${editingPost.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, location, scheduled_time: scheduledTime || null, content })
          });
          if (res.ok) {
              showToast('Lưu thay đổi thành công!', 'success');
              setShowEditModal(false);
              fetchPosts();
          } else {
              showToast('Lỗi khi lưu bài viết.', 'error');
          }
      } catch (e) {
          console.error(e);
          showToast('Lỗi kết nối khi lưu.', 'error');
      } finally {
          setIsSavingEdit(false);
      }
  };

  // Khi chuyển từ Preview sang HTML: đảm bảo textarea lấy lại liveContent
  const handleToggleView = (mode: 'html' | 'preview') => {
    setContentViewMode(mode);
  };

  return (
    <>
      <div className="animate-fade-in relative">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title-xl">Quản lý & Tất cả bài viết</h1>
          <p className="text-secondary">Theo dõi các bài viết đã cào, lên lịch đăng hoặc đăng ngay lập tức.</p>
        </div>
        <button className="btn btn-primary">Viết bài thủ công mới</button>
      </header>

      <div className="glass-card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <input type="text" placeholder="Tìm kiếm tiêu đề..." className="form-input" style={{ maxWidth: '300px' }} />
          <select className="form-select" style={{ maxWidth: '150px' }}>
            <option>Mọi trạng thái</option>
            <option>Chờ đăng (Đã cào)</option>
            <option>Đã đăng thành công</option>
            <option>Bản nháp</option>
          </select>
          <select className="form-select" style={{ maxWidth: '200px' }}>
            <option>Mọi vị trí (Menu)</option>
            <option>Tin tức sự kiện</option>
            <option>Y học thường thức</option>
            <option>Hoạt động chuyên môn</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '500', width: '30%' }}>Tiêu đề bài viết</th>
                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Nguồn bài</th>
                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Vị trí đăng bài</th>
                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '500', minWidth: '160px' }}>Thời gian</th>
                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Trạng thái</th>
                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '500', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem', lineHeight: '1.4' }}>{row.title}</div>
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Globe size={12} color="var(--accent-primary)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>{getSourceName(row.source_url)}</div>
                        <a href={row.source_url} target="_blank" rel="noreferrer" className="text-secondary" style={{ fontSize: '0.75rem', textDecoration: 'underline', opacity: 0.8 }}>Xem gốc</a>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem' }}>
                      <MapPin size={14} color="var(--accent-secondary)" />
                      {row.location}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                      {/* Ngày cào */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                        <Clock size={12} color="var(--text-muted)" />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Cào:</span>
                        <span>{row.created_at
                          ? new Date(row.created_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
                          : '—'}
                        </span>
                      </div>
                      {/* Ngày đăng hoặc lịch hẹn */}
                      {row.status === 'published' && row.published_at ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Send size={12} color="var(--success)" />
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Đăng:</span>
                          <span style={{ color: 'var(--success)', fontWeight: '500' }}>
                            {new Date(row.published_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                          </span>
                        </div>
                      ) : row.scheduled_time ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={12} color="var(--warning)" />
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Hẹn:</span>
                          <span style={{ color: 'var(--warning)', fontWeight: '500' }}>
                            {new Date(row.scheduled_time).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
                          <Clock size={12} />
                          <span style={{ fontSize: '0.75rem' }}>Chưa lên lịch</span>
                        </div>
                      )}
                      {/* Ngày sửa (nếu có) */}
                      {row.updated_at && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Edit size={12} color="var(--accent-primary)" />
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Sửa:</span>
                          <span style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>
                            {new Date(row.updated_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
                      <span className={`badge ${
                        row.status === 'published' ? 'success' 
                        : row.status === 'pending' ? 'primary' 
                        : row.status === 'failed' ? 'error'
                        : 'warning'
                      }`}>
                        {row.status === 'published' ? '✅ Đã đăng' 
                         : row.status === 'pending' ? '⏳ Chờ đăng' 
                         : row.status === 'failed' ? '❌ Lỗi đăng'
                         : row.status}
                      </span>
                      {row.status === 'published' && (
                        <a 
                          href={generatePostUrl(row.title, row.location, row.source_url)} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ 
                            fontSize: '0.75rem', color: 'var(--accent-primary)', 
                            textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '0.2rem' 
                          }}
                        >
                          <Globe size={10} /> Xem bài đăng
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {row.status === 'pending' && (
                        <button 
                          onClick={() => handlePublishNow(row.id)}
                          className="btn btn-primary" 
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          title="Đăng ngay lập tức không cần chờ"
                        >
                          <Send size={14} /> Đăng ngay
                        </button>
                      )}

                      {row.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(row.id)}
                          className="btn btn-warning"
                          style={{ 
                            padding: '0.4rem 0.75rem', fontSize: '0.85rem', 
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#fff', border: 'none', borderRadius: '8px',
                            cursor: 'pointer', fontWeight: '600'
                          }}
                          title="Thử đăng lại bài bị lỗi"
                        >
                          <RefreshCw size={14} /> Đăng lại
                        </button>
                      )}

                      {row.status === 'publishing' && (
                        <button disabled
                          style={{ 
                            padding: '0.4rem 0.75rem', fontSize: '0.85rem', 
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            background: 'rgba(99,179,237,0.15)', color: 'var(--accent)',
                            border: '1px solid var(--accent)', borderRadius: '8px',
                            cursor: 'not-allowed', fontWeight: '600'
                          }}
                        >
                          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Đang đăng...
                        </button>
                      )}
                      
                      {row.status === 'published' ? (
                        <button 
                          onClick={() => handleEditClick(row)}
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.75rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
                          title="Sửa nội dung bài viết đã đăng (Sẽ ghi đè lên website)"
                        >
                          <Edit size={14} /> Sửa bài
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleEditClick(row)}
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem', color: 'var(--text-primary)' }}
                          title="Chỉnh sửa nội dung & lịch trình"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleDelete(row.id)}
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem', color: 'var(--error)' }}
                        title="Xóa bài viết"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Modal Chỉnh sửa nhanh */}
      {showEditModal && editingPost && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="title-lg">
                {editingPost.status === 'published' ? 'Sửa Bài Đã Đăng (Ghi đè website)' : 'Chỉnh sửa & Lên lịch bài viết'}
              </h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Tiêu đề bài viết</label>
              <input type="text" id="edit_title" className="form-input" defaultValue={editingPost.title} />
            </div>

            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">Vị trí đăng bài (Menu)</label>
                <select id="edit_location" className="form-select" defaultValue={editingPost.location}>
                  <option value="Tin tức sự kiện">Tin tức sự kiện</option>
                  <option value="Y học thường thức">Y học thường thức</option>
                  <option value="Hoạt động chuyên môn">Hoạt động chuyên môn</option>
                  <option value="Văn bản công bố">Văn bản công bố</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Thời gian đăng tự động</label>
                <input 
                  type="datetime-local" 
                  id="edit_time"
                  className="form-input" 
                  defaultValue={editingPost.scheduled_time ? editingPost.scheduled_time.substring(0,16) : ''} 
                />
              </div>
            </div>

            <div className="form-group">
              {/* Header: label + toggle buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Nội dung bài viết</label>
                <div style={{
                  display: 'flex', gap: '0', borderRadius: '8px', overflow: 'hidden',
                  border: '1px solid var(--border-color)'
                }}>
                  <button
                    type="button"
                    onClick={() => handleToggleView('html')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: '600',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      background: contentViewMode === 'html'
                        ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                        : 'transparent',
                      color: contentViewMode === 'html' ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    <Code size={13} /> HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleView('preview')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: '600',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      background: contentViewMode === 'preview'
                        ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                        : 'transparent',
                      color: contentViewMode === 'preview' ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    <Eye size={13} /> Preview
                  </button>
                </div>
              </div>

              {/* HTML Editor */}
              {contentViewMode === 'html' && (
                <textarea
                  ref={textareaRef}
                  id="edit_content"
                  className="form-textarea"
                  style={{
                    height: '260px',
                    fontFamily: '"Fira Code", "Cascadia Code", "Courier New", monospace',
                    fontSize: '0.82rem',
                    lineHeight: '1.6',
                    background: 'rgba(0,0,0,0.25)',
                    color: '#a5f3fc',
                    border: '1px solid rgba(99,102,241,0.3)',
                  }}
                  value={liveContent}
                  onChange={(e) => setLiveContent(e.target.value)}
                />
              )}

              {/* Preview Renderer */}
              {contentViewMode === 'preview' && (
                <div
                  style={{
                    height: '260px',
                    overflowY: 'auto',
                    padding: '1rem 1.25rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    lineHeight: '1.75',
                  }}
                  dangerouslySetInnerHTML={{ __html: liveContent }}
                />
              )}

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                {contentViewMode === 'html'
                  ? '✏️ Chế độ HTML — chỉnh sửa trực tiếp mã nguồn.'
                  : '👁️ Chế độ Preview — xem bài viết như khi hiển thị thực tế.'}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={isSavingEdit}>Hủy bỏ</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={isSavingEdit} style={{ minWidth: '120px' }}>
                {isSavingEdit ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
