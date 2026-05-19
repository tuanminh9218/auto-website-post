import { Image as ImageIcon, Calendar, Tag, Type } from 'lucide-react';

export default function CreatePost() {
  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="title-xl">Tạo bài viết mới</h1>
        <p className="text-secondary">Viết hoặc chỉnh sửa bài viết theo cách thủ công trước khi xuất bản.</p>
      </header>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Main Editor Area */}
        <div className="glass-card">
          <div className="form-group">
            <label className="form-label"><Type size={14} style={{ display: 'inline', marginRight: '0.3rem' }}/> Tiêu đề bài viết</label>
            <input type="text" className="form-input" placeholder="Nhập một tiêu đề hấp dẫn..." />
          </div>
          
          <div className="form-group">
            <label className="form-label">Nội dung</label>
            <textarea className="form-textarea" style={{ minHeight: '300px' }} placeholder="Viết nội dung của bạn ở đây. Hỗ trợ HTML/Markdown..."></textarea>
          </div>

          <div className="form-group">
            <label className="form-label"><ImageIcon size={14} style={{ display: 'inline', marginRight: '0.3rem' }}/> Ảnh đại diện & Watermark</label>
            <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
              <ImageIcon size={32} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
              <p>Kéo thả ảnh vào đây, hoặc click để chọn tệp.</p>
              <button className="btn btn-secondary" style={{ marginTop: '1rem' }}>Tải ảnh lên</button>
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="watermark" defaultChecked />
                <label htmlFor="watermark" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Tự động chèn Logo Website</label>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Settings Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <h3 className="title-lg" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Cài đặt xuất bản</h3>
            
            <div className="form-group">
              <label className="form-label"><Calendar size={14} style={{ display: 'inline', marginRight: '0.3rem' }}/> Lên lịch</label>
              <input type="datetime-local" className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Chuyên mục</label>
              <select className="form-select">
                <option>Y học 360</option>
                <option>Sức khỏe cộng đồng</option>
                <option>Dinh dưỡng</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label"><Tag size={14} style={{ display: 'inline', marginRight: '0.3rem' }}/> Thẻ Tags (phân cách bằng dấu phẩy)</label>
              <input type="text" className="form-input" placeholder="VD: y học, sức khỏe, covid..." />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="title-lg" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Tối ưu hóa bằng AI</h3>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Sử dụng AI để tự động viết lại bài cho chuẩn SEO và dễ đọc hơn.</p>
            <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '0.5rem' }}>Tối ưu hóa Nội dung</button>
            <button className="btn btn-secondary" style={{ width: '100%' }}>Tạo Thẻ Tags & Chuyên mục tự động</button>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }}>Lưu nháp</button>
            <button className="btn btn-primary" style={{ flex: 2 }}>Đăng ngay</button>
          </div>
        </div>
      </div>
    </div>
  );
}
