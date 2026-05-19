import { useState, useEffect } from 'react';
import { Globe, Plus, Play, Pause, Trash2, DownloadCloud, X, MapPin, RefreshCw, Zap, Edit } from 'lucide-react';
import { useToast } from '../components/ToastContext';

const LOCATIONS = [
  'Tin tức sự kiện',
  'Y học thường thức',
  'Hoạt động chuyên môn',
  'Văn bản công bố',
  'Nghiên cứu khoa học',
];

// Xóa mảng FREQUENCIES vì không còn dùng dropdown nữa

interface Source {
  id: number;
  name: string;
  url: string;
  limit: number;
  frequency: string;
  location: string;
  auto_post: boolean;
  is_active: boolean;
  created_at: string | null;
  last_run_at: string | null;
}

export default function AutoScraper() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  // Lấy thời gian hiện tại theo định dạng DD/MM/YYYY HH:mm
  const getCurrentFormattedTime = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  // Form state
  const [form, setForm] = useState({
    name: '',
    url: '',
    limit: 2,
    frequency: '08:00, 15:30',
    location: 'Tin tức sự kiện',
    auto_post: false,
    start_post_time: getCurrentFormattedTime(),
    post_interval_minutes: 60,
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/sources');
      if (res.ok) setSources(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchSources(); }, []);

  const resetForm = () => {
    setShowAddModal(false);
    setEditId(null);
    setForm({ 
      name: '', url: '', limit: 2, frequency: '08:00, 15:30', 
      location: 'Tin tức sự kiện', auto_post: false, 
      start_post_time: getCurrentFormattedTime(), 
      post_interval_minutes: 60 
    });
    setFormError('');
  };

  const handleSaveSource = async () => {
    setFormError('');
    if (!form.name.trim()) { setFormError('Vui lòng nhập tên nguồn.'); return; }
    if (!form.url.trim() || !form.url.startsWith('http')) { setFormError('URL không hợp lệ.'); return; }
    
    let parsedStartTime = null;
    if (form.auto_post) {
      if (!form.start_post_time.trim()) {
        setFormError('Vui lòng nhập thời gian bắt đầu đăng bài.'); return;
      }
      // Parse DD/MM/YYYY HH:mm to ISO string for backend
      const parts = form.start_post_time.trim().split(' ');
      if (parts.length !== 2) { setFormError('Định dạng thời gian phải là DD/MM/YYYY HH:mm'); return; }
      const dateParts = parts[0].split('/');
      if (dateParts.length !== 3) { setFormError('Định dạng ngày phải là DD/MM/YYYY'); return; }
      const timeParts = parts[1].split(':');
      if (timeParts.length !== 2) { setFormError('Định dạng giờ phải là HH:mm'); return; }
      
      const [dd, mm, yyyy] = dateParts;
      const [hh, min] = timeParts;
      parsedStartTime = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
    }

    const payload = {
      ...form,
      start_post_time: parsedStartTime
    };

    setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/sources/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setSources(prev => prev.map(s => s.id === editId ? updated : s));
          resetForm();
        } else {
          const err = await res.json().catch(() => ({}));
          setFormError(err.detail || 'Lỗi khi cập nhật nguồn.');
        }
      } else {
        const res = await fetch('/api/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setSources(prev => [created, ...prev]);
          resetForm();
        } else {
          const err = await res.json().catch(() => ({}));
          // Hiển thị lỗi chi tiết từ backend nếu có (hữu ích cho debug 422)
          let errMsg = err.detail || 'Lỗi khi thêm nguồn.';
          if (Array.isArray(err.detail)) {
             errMsg = err.detail.map((d: any) => `${d.loc?.join('.')} ${d.msg}`).join(', ');
          }
          setFormError(errMsg);
        }
      }
    } catch (e) {
      setFormError('Lỗi kết nối đến server.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (source: Source) => {
    let displayTime = '';
    if (source.start_post_time) {
      const dateObj = new Date(source.start_post_time);
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yyyy = dateObj.getFullYear();
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      displayTime = `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }

    setForm({
      name: source.name,
      url: source.url,
      limit: source.limit,
      frequency: source.frequency,
      location: source.location,
      auto_post: source.auto_post,
      start_post_time: displayTime || getCurrentFormattedTime(),
      post_interval_minutes: source.post_interval_minutes || 60,
    });
    setEditId(source.id);
    setShowAddModal(true);
  };

  const handleToggle = async (id: number) => {
    try {
      const res = await fetch(`/api/sources/${id}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        const { is_active } = await res.json();
        setSources(prev => prev.map(s => s.id === id ? { ...s, is_active } : s));
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Xóa nguồn "${name}"?`)) return;
    try {
      const res = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      if (res.ok) setSources(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleRunNow = async (id: number, name: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/sources/${id}/run`, { method: 'POST' });
      if (res.ok) {
        showToast(`Đã bắt đầu cào từ "${name}". Kiểm tra mục "Tất cả bài viết".`, 'success');
      }
    } catch (e) {
      showToast('Lỗi khi chạy cào.', 'error');
    } finally {
      setLoadingId(null);
      fetchSources();
    }
  };

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Chưa chạy';

  return (
    <>
      <div className="animate-fade-in relative">
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title-xl">Auto Scraper &amp; Tự động cào</h1>
          <p className="text-secondary">Cấu hình các nguồn website để tự động lấy bài. Tất cả bài viết được cào sẽ được lưu dưới dạng "Chờ đăng" sang mục "Tất cả bài viết" để bạn quản lý.</p>
        </div>
        <button onClick={() => { setEditId(null); setShowAddModal(true); }} className="btn btn-primary">
          <Plus size={18} /> Thêm Nguồn Cào Mới
        </button>
      </header>

      {/* Box Cào Nhanh */}
      <div className="glass-card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-primary)', background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), transparent)' }}>
        <h3 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DownloadCloud color="var(--accent-primary)" size={20} />
          Chạy cào dữ liệu ngay lập tức
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Chỉ định một URL và số lượng bài bạn muốn cào ngay bây giờ. Bot sẽ cào và đẩy thẳng sang mục "Tất cả bài viết".
        </p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
            <label className="form-label">Đường dẫn nguồn cào (URL)</label>
            <input type="text" id="scrape_url" className="form-input" placeholder="https://suckhoedoisong.vn/y-hoc-360.htm" defaultValue="https://suckhoedoisong.vn/y-hoc-360.htm" />
          </div>
          <div className="form-group" style={{ flex: 0.6, marginBottom: 0 }}>
            <label className="form-label">Số lượng bài</label>
            <input type="number" id="scrape_limit" className="form-input" defaultValue={2} min={1} max={20} />
          </div>
          <button className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', height: '42px' }} onClick={async () => {
            const url = (document.getElementById('scrape_url') as HTMLInputElement).value;
            const limit = parseInt((document.getElementById('scrape_limit') as HTMLInputElement).value);
            try {
              const res = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, limit, auto_post: false }) });
              if (res.ok) {
                showToast('Bắt đầu cào dữ liệu chạy ngầm. Vui lòng sang mục Tất cả bài viết để kiểm tra.', 'success');
              } else {
                showToast('Lỗi khi tạo cào dữ liệu.', 'error');
              }
            } catch (e) {
              showToast('Lỗi kết nối. Không thể tạo cào dữ liệu.', 'error');
            }
          }}>
            Bắt đầu cào ngay
          </button>
        </div>
      </div>

      {/* Danh sách nguồn từ DB */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h3 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          Các Nguồn Tự Động (Lên lịch)
          <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            {sources.length} nguồn
          </span>
        </h3>

        {sources.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Globe size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <p>Chưa có nguồn nào. Nhấn <strong>"+ Thêm Nguồn Cào Mới"</strong> để bắt đầu.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sources.map((source) => (
              <div key={source.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.25rem', background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--border-radius-md)',
                border: `1px solid ${source.is_active ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}`,
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: source.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Globe color={source.is_active ? 'var(--success)' : 'var(--text-muted)'} size={20} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.2rem' }}>{source.name}</h4>
                    <a href={source.url} target="_blank" rel="noreferrer" className="text-secondary" style={{ fontSize: '0.8rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{source.url}</a>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <MapPin size={11} /> {source.location}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Cào {source.limit} bài · {source.frequency}
                      </span>
                      {source.auto_post && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Zap size={11} /> Tự động đăng
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className={`badge ${source.is_active ? 'success' : 'warning'}`} style={{ marginBottom: '0.3rem' }}>
                      {source.is_active ? '● Đang chạy' : '◉ Tạm dừng'}
                    </div>
                    <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                      Cào lần cuối: {formatDate(source.last_run_at)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => handleRunNow(source.id, source.name)}
                      disabled={loadingId === source.id}
                      className="btn btn-secondary"
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      title="Cào ngay"
                    >
                      <RefreshCw size={13} style={loadingId === source.id ? { animation: 'spin 1s linear infinite' } : {}} />
                      {loadingId === source.id ? 'Đang cào...' : 'Cào ngay'}
                    </button>

                    <button
                      onClick={() => handleToggle(source.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.45rem' }}
                      title={source.is_active ? 'Tạm dừng' : 'Bật lại'}
                    >
                      {source.is_active ? <Pause size={15} /> : <Play size={15} />}
                    </button>

                    <button
                      onClick={() => handleEditClick(source)}
                      className="btn btn-secondary"
                      style={{ padding: '0.45rem', color: 'var(--text-primary)' }}
                      title="Sửa cấu hình nguồn"
                    >
                      <Edit size={15} />
                    </button>

                    <button
                      onClick={() => handleDelete(source.id, source.name)}
                      className="btn btn-secondary"
                      style={{ padding: '0.45rem', color: 'var(--error)' }}
                      title="Xóa nguồn"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Modal Thêm Nguồn */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="title-lg" style={{ margin: 0 }}>{editId ? 'Sửa Cấu Hình Nguồn' : 'Thêm Nguồn Cào Tự Động'}</h2>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {formError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: 'var(--error)', fontSize: '0.9rem' }}>
                ⚠️ {formError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Tên gọi nguồn <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="text" className="form-input" placeholder="VD: Báo Sức Khỏe Đời Sống"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">URL Chuyên mục cào <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="text" className="form-input" placeholder="https://..."
                value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
            </div>

            {/* Vị trí đăng bài */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={14} color="var(--accent-secondary)" /> Vị trí đăng bài (Menu website)
              </label>
              <select className="form-select" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}>
                {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">Số lượng bài / lần chạy</label>
                <input type="number" className="form-input" min={1} max={20}
                  value={form.limit} onChange={e => setForm({ ...form, limit: parseInt(e.target.value) || 2 })} />
              </div>
              <div className="form-group">
                <label className="form-label">Thời gian cào hàng ngày</label>
                <input type="text" className="form-input" placeholder="VD: 08:00, 14:30"
                  value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} />
                <span className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Cách nhau bằng dấu phẩy (HH:mm)</span>
              </div>
            </div>

            {/* Auto post toggle & Scheduling */}
            <div className="form-group" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <input type="checkbox" id="auto_post_toggle" style={{ marginTop: '3px', width: '16px', height: '16px', cursor: 'pointer' }}
                  checked={form.auto_post} onChange={e => setForm({ ...form, auto_post: e.target.checked })} />
                <div>
                  <label htmlFor="auto_post_toggle" style={{ fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Zap size={14} color="var(--accent-primary)" /> Lên lịch tự động đăng lên website
                  </label>
                  <p className="text-secondary" style={{ fontSize: '0.82rem', marginTop: '0.3rem' }}>
                    Các bài cào về sẽ được thiết lập tự động đăng lên <strong>{form.location}</strong>.
                  </p>
                </div>
              </div>

              {form.auto_post && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div className="form-group" style={{ marginBottom: 0 }}>
                     <label className="form-label" style={{ fontSize: '0.8rem' }}>Thời gian bài đầu tiên</label>
                     <input type="text" className="form-input" style={{ fontSize: '0.85rem', padding: '0.5rem', fontFamily: 'monospace' }} placeholder="DD/MM/YYYY HH:mm"
                       value={form.start_post_time} onChange={e => setForm({...form, start_post_time: e.target.value})} />
                   </div>
                   <div className="form-group" style={{ marginBottom: 0 }}>
                     <label className="form-label" style={{ fontSize: '0.8rem' }}>Khoảng cách mỗi bài</label>
                     <div style={{ position: 'relative' }}>
                       <input type="number" className="form-input" style={{ fontSize: '0.85rem', padding: '0.5rem', paddingRight: '2.5rem' }} min={0} step={15}
                         value={form.post_interval_minutes} onChange={e => setForm({...form, post_interval_minutes: parseInt(e.target.value) || 0})} />
                       <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>phút</span>
                     </div>
                   </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={resetForm}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveSource} disabled={saving} style={{ minWidth: '120px' }}>
                {saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={16} /> Lưu Nguồn</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
