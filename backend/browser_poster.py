from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
import time
import os
import re
import json

class BrowserPoster:
    def __init__(self, admin_url: str, username: str, password: str, headless: bool = True):
        self.admin_url = admin_url
        self.username = username
        self.password = password
        self.headless = headless

    def _inject_ckeditor_content(self, page, content: str) -> bool:
        """
        Inject nội dung vào CKEditor bằng JS API.
        Trả về True nếu thành công.
        """
        # Thử CKEditor 4 (CKEDITOR global object)
        try:
            has_ck4 = page.evaluate("typeof CKEDITOR !== 'undefined' && Object.keys(CKEDITOR.instances).length > 0")
            if has_ck4:
                print("Phát hiện CKEditor 4, đang inject nội dung qua API...")
                page.evaluate(f"""
                    var editorName = Object.keys(CKEDITOR.instances)[0];
                    if (editorName) {{
                        CKEDITOR.instances[editorName].setData({json.dumps(content)});
                    }}
                """)
                time.sleep(1)
                # Xác nhận inject thành công
                char_count = page.evaluate("""
                    var editorName = Object.keys(CKEDITOR.instances)[0];
                    CKEDITOR.instances[editorName].getData().length;
                """)
                print(f"CKEditor4: Đã inject {char_count} ký tự.")
                return char_count > 0
        except Exception as e:
            print(f"CKEditor4 inject failed: {e}")

        # Thử CKEditor 5
        try:
            ck5_editor = page.locator('.ck-editor__editable[contenteditable="true"]')
            if ck5_editor.count() > 0:
                print("Phát hiện CKEditor 5, đang inject nội dung...")
                ck5_editor.first.click()
                page.keyboard.press("Control+a")
                page.keyboard.press("Delete")
                # Inject HTML qua JS vào CKEditor 5 instance
                page.evaluate(f"""
                    var editor = document.querySelector('.ck-editor__editable');
                    if (editor && editor.__vue__) {{
                        editor.__vue__.$emit('input', {json.dumps(content)});
                    }}
                """)
                # Fallback: type trực tiếp
                ck5_editor.first.fill(content)
                return True
        except Exception as e:
            print(f"CKEditor5 inject failed: {e}")

        # Fallback: textarea hoặc quill
        try:
            textarea = page.locator('.ql-editor, textarea[name*="content"], textarea[placeholder*="nội dung"]').first
            if textarea.count() > 0:
                textarea.fill(content)
                return True
        except Exception as e:
            print(f"Textarea fallback failed: {e}")

        print("CẢNH BÁO: Không thể inject nội dung vào editor!")
        return False

    def create_post(self, title: str, content: str, image_path: str = None, location: str = "Tin tức sự kiện") -> bool:
        """
        Tự động đăng bài lên mpuh.vn/admin thông qua trình duyệt ảo (Playwright).
        Trả về True nếu bài đăng thành công (xác nhận qua URL redirect).
        """
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=self.headless)
                context = browser.new_context(
                    viewport={'width': 1366, 'height': 900},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                page = context.new_page()

                # ==========================================
                # BƯỚC 1: ĐĂNG NHẬP
                # ==========================================
                print(f"[1/5] Đang mở trang admin: {self.admin_url}")
                page.goto(self.admin_url, wait_until="networkidle", timeout=30000)
                page.screenshot(path="debug_step1_login_page.png")

                page.wait_for_selector('input[type="password"]', timeout=15000)
                
                username_input = page.locator('input[type="text"], input[type="email"]').first
                password_input = page.locator('input[type="password"]').first

                username_input.fill(self.username)
                password_input.fill(self.password)
                password_input.press("Enter")
                
                page.wait_for_load_state("networkidle")
                time.sleep(2)
                page.screenshot(path="debug_step1_after_login.png")
                print(f"  → URL sau đăng nhập: {page.url}")

                # Kiểm tra đăng nhập thành công
                if "login" in page.url.lower() or "dang-nhap" in page.url.lower():
                    print("LỖI: Đăng nhập thất bại! Kiểm tra lại tài khoản/mật khẩu.")
                    return False

                # ==========================================
                # BƯỚC 2: MỞ MENU QUẢN LÝ TIN TỨC
                # ==========================================
                print("[2/5] Đang mở menu 'Quản lý tin tức'...")
                
                news_menu = page.locator('a:has-text("Quản lý tin tức"), span:has-text("Quản lý tin tức"), li:has-text("Quản lý tin tức")')
                if news_menu.count() == 0:
                    print("Không tìm thấy menu 'Quản lý tin tức'!")
                    page.screenshot(path="debug_step2_no_menu.png")
                    return False
                    
                news_menu.first.click()
                page.wait_for_load_state("networkidle")
                time.sleep(1.5)
                page.screenshot(path="debug_step2_news_list.png")

                # ==========================================
                # BƯỚC 3: NHẤN NÚT THÊM MỚI
                # ==========================================
                print("[3/5] Đang nhấn nút 'Thêm mới'...")
                
                add_btn = page.locator('a:has-text("Thêm mới"), button:has-text("Thêm mới")').first
                if add_btn.count() == 0:
                    print("Không tìm thấy nút 'Thêm mới'!")
                    page.screenshot(path="debug_step3_no_add_btn.png")
                    return False

                add_btn.click()
                page.wait_for_load_state("networkidle")
                time.sleep(2.5)  # Chờ React form + CKEditor khởi tạo đầy đủ
                page.screenshot(path="debug_step3_add_form.png")

                # ==========================================
                # BƯỚC 4: ĐIỀN THÔNG TIN BÀI VIẾT
                # ==========================================
                print(f"[4/5] Đang điền nội dung bài: {title[:40]}...")

                # --- Điền Tiêu đề ---
                title_input = page.locator(
                    'input[placeholder*="tiêu đề"], input[placeholder*="Tiêu đề"], '
                    'input[name*="title"], input[name*="tieu_de"]'
                ).first
                if title_input.count() > 0:
                    title_input.fill(title)
                else:
                    # Fallback: input text đầu tiên trên trang
                    all_text = page.locator('input[type="text"]')
                    if all_text.count() > 0:
                        all_text.first.fill(title)
                    else:
                        print("CẢNH BÁO: Không tìm thấy ô nhập tiêu đề!")

                time.sleep(0.5)

                # --- Chọn Menu / Danh mục (React-Select component) ---
                print(f"  Đang chọn danh mục: {location}")
                menu_selected = False
                try:
                    # React-Select: click vào .select__control để mở dropdown
                    select_control = page.locator('.select__control, .css-fz8d9w-control, [class*="select__control"]').first
                    if select_control.count() > 0:
                        select_control.click()
                        time.sleep(0.8)  # Chờ dropdown mở
                        
                        # Tìm và click option có text trùng với location
                        option = page.locator(f'.select__option:has-text("{location}"), [class*="select__option"]:has-text("{location}")')
                        if option.count() > 0:
                            option.first.click()
                            time.sleep(0.5)
                            menu_selected = True
                            print(f"  → Đã chọn danh mục: {location}")
                        else:
                            # Thử type vào input của react-select để lọc
                            react_input = page.locator('#react-select-5-input, input[id*="react-select"]').first
                            if react_input.count() > 0:
                                react_input.fill(location)
                                time.sleep(0.5)
                                # Click option đầu tiên xuất hiện
                                first_opt = page.locator('.select__option, [class*="select__option"]').first
                                if first_opt.count() > 0:
                                    first_opt.click()
                                    menu_selected = True
                                    print(f"  → Đã chọn danh mục qua search: {location}")
                            
                            if not menu_selected:
                                # Log tất cả options để debug
                                all_opts = page.locator('.select__option, [class*="select__option"]').all()
                                print(f"  Các options tìm thấy: {[o.inner_text() for o in all_opts[:10]]}")
                                # Chọn option đầu tiên nếu không tìm thấy đúng
                                if all_opts:
                                    all_opts[0].click()
                                    menu_selected = True
                                    print(f"  → Đã chọn option đầu tiên (fallback)")
                    else:
                        print("  CẢNH BÁO: Không tìm thấy dropdown Menu!")
                except Exception as e:
                    print(f"  LỖI chọn menu: {e}")

                if not menu_selected:
                    print("  CẢNH BÁO: Không chọn được danh mục!")


                time.sleep(0.5)

                # --- Điền Mô tả ngắn ---
                clean_text = re.sub('<[^<]+>', '', content)[:200] + "..."
                # Tìm textarea có placeholder/name liên quan đến mô tả, hoặc thẻ đi sau label "Mô tả ngắn (*)"
                short_desc = page.locator('textarea[placeholder*="mô tả"], textarea[placeholder*="Mô tả"], textarea[name*="short"], textarea[name*="tom_tat"], textarea[name*="description"], label:has-text("Mô tả ngắn") + * textarea, label:has-text("Mô tả ngắn") ~ textarea')
                if short_desc.count() > 0:
                    short_desc.first.fill(clean_text)
                    print("  → Đã điền mô tả ngắn.")

                time.sleep(0.5)

                # --- Tải ảnh lên ---
                if image_path and os.path.exists(image_path):
                    print(f"  Đang tải ảnh: {os.path.basename(image_path)}")
                    file_input = page.locator('input[type="file"]')
                    if file_input.count() > 0:
                        file_input.first.set_input_files(image_path)
                        time.sleep(3)  # Chờ upload + preview
                        print("  → Đã tải ảnh lên.")
                    else:
                        print("  CẢNH BÁO: Không tìm thấy ô upload ảnh!")

                # --- Inject nội dung vào CKEditor ---
                print("  Đang inject nội dung vào CKEditor...")
                time.sleep(1)  # Đảm bảo CKEditor đã load
                content_injected = self._inject_ckeditor_content(page, content)
                if not content_injected:
                    print("  CẢNH BÁO: Không inject được nội dung!")

                page.screenshot(path="debug_step4_before_submit.png")

                # ==========================================
                # BƯỚC 5: SUBMIT / ĐĂNG BÀI
                # ==========================================
                print("[5/5] Đang submit bài viết...")
                
                # Cuộn xuống để đảm bảo nút Thêm mới có thể click
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(1)

                # Nút submit cuối form (thường là nút "Thêm mới" cuối cùng)
                submit_buttons = page.locator('button:has-text("Thêm mới"), button[type="submit"]')
                url_before = page.url

                if submit_buttons.count() > 0:
                    # Click nút cuối cùng (nút submit, không phải nút mở form)
                    submit_buttons.last.click()
                    print(f"  → Đã click nút submit (tổng {submit_buttons.count()} nút tìm thấy).")
                else:
                    print("LỖI: Không tìm thấy nút submit!")
                    page.screenshot(path="debug_step5_no_submit.png")
                    return False

                # ==========================================
                # XỬ LÝ POPUP XÁC NHẬN
                # Website hiện dialog: "Bạn có muốn thêm tiếp tin tức?"
                # Cần click "Đồng ý" để hoàn tất đăng bài
                # ==========================================
                popup_handled = False
                
                # Thử chờ popup xuất hiện trong 5 giây
                try:
                    page.wait_for_selector(
                        'button:has-text("Đồng ý"), button:has-text("Xác nhận"), .ant-modal button.ant-btn-primary',
                        timeout=5000
                    )
                    # Popup xuất hiện → click Đồng ý
                    confirm_btn = page.locator(
                        'button:has-text("Đồng ý"), '
                        '.ant-modal button.ant-btn-primary, '
                        '.swal2-confirm'
                    )
                    if confirm_btn.count() > 0:
                        print("  → Phát hiện popup xác nhận, đang click 'Đồng ý'...")
                        page.screenshot(path="debug_step5_popup.png")
                        confirm_btn.first.click()
                        popup_handled = True
                        time.sleep(3)
                        page.wait_for_load_state("networkidle")
                        print("  → Đã xác nhận popup.")
                except Exception:
                    # Không có popup trong 5 giây → OK, tiếp tục
                    print("  → Không có popup xác nhận, tiếp tục kiểm tra kết quả...")
                    page.wait_for_load_state("networkidle")

                page.screenshot(path="debug_step5_after_submit.png")
                
                url_after = page.url
                print(f"  URL trước submit: {url_before}")
                print(f"  URL sau submit:   {url_after}")
                print(f"  Popup đã xử lý: {popup_handled}")

                # ==========================================
                # KIỂM TRA KẾT QUẢ THỰC TẾ
                # Thành công khi:
                # 1. URL thay đổi (redirect về danh sách)
                # 2. Hoặc có thông báo thành công
                # ==========================================
                page_text = ""
                try:
                    page_text = page.inner_text("body")
                except Exception:
                    pass

                success_keywords = ["thành công", "Thêm thành công", "Đã lưu", "success", "Đã thêm"]
                success_indicators = [
                    url_after != url_before,
                    page.locator('.ant-message-success, .alert-success, .toast-success, .swal2-success').count() > 0,
                    any(kw in page_text for kw in success_keywords),
                ]

                if any(success_indicators):
                    print(f"✅ ĐĂNG BÀI THÀNH CÔNG! URL mới: {url_after}")
                    browser.close()
                    return True
                else:
                    # Kiểm tra thông báo lỗi cụ thể
                    error_selectors = '.ant-message-error, .alert-danger, .swal2-error, [class*="error-message"]'
                    error_els = page.locator(error_selectors)
                    if error_els.count() > 0:
                        try:
                            err_text = error_els.first.inner_text()
                            print(f"❌ LỖI TỪ WEBSITE: {err_text}")
                        except Exception:
                            pass

                    # Nếu popup đã được xử lý nhưng URL không đổi → có thể form validation lỗi
                    if popup_handled:
                        print("⚠️ Popup đã click nhưng URL không thay đổi → Kiểm tra form validation!")
                    else:
                        print("⚠️ Không tìm thấy popup → Có thể bài bị reject do form thiếu trường bắt buộc (ảnh?)")
                    
                    print("   Xem ảnh: debug_step5_after_submit.png để biết chi tiết")
                    browser.close()
                    return False

        except PlaywrightTimeoutError as e:
            print(f"TIMEOUT: Trang web phản hồi quá chậm: {e}")
            return False
        except Exception as e:
            print(f"LỖI: {str(e).encode('utf-8', 'replace').decode('utf-8')}")
            return False

    def update_post(self, title: str, new_content: str, location: str = "Tin tức sự kiện") -> bool:
        """
        Tìm bài viết theo tiêu đề và cập nhật nội dung trên mpuh.vn/admin.
        """
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=self.headless)
                context = browser.new_context(
                    viewport={'width': 1366, 'height': 900},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                page = context.new_page()

                print(f"[1/5] Đang mở trang admin để cập nhật: {self.admin_url}")
                page.goto(self.admin_url, wait_until="networkidle", timeout=30000)

                page.wait_for_selector('input[type="password"]', timeout=15000)
                username_input = page.locator('input[type="text"], input[type="email"]').first
                password_input = page.locator('input[type="password"]').first

                username_input.fill(self.username)
                password_input.fill(self.password)
                password_input.press("Enter")
                
                page.wait_for_load_state("networkidle")
                time.sleep(2)

                if "login" in page.url.lower() or "dang-nhap" in page.url.lower():
                    print("LỖI: Đăng nhập thất bại!")
                    return False

                print("[2/5] Đang mở menu 'Quản lý tin tức'...")
                news_menu = page.locator('a:has-text("Quản lý tin tức"), span:has-text("Quản lý tin tức"), li:has-text("Quản lý tin tức")')
                if news_menu.count() == 0:
                    print("Không tìm thấy menu 'Quản lý tin tức'!")
                    return False
                    
                news_menu.first.click()
                page.wait_for_load_state("networkidle")
                time.sleep(2)

                print(f"[3/5] Đang tìm bài viết có tiêu đề: {title[:40]}...")
                # Thử tìm ô tìm kiếm
                search_input = page.locator('input[placeholder*="tìm kiếm"], input[placeholder*="Tìm kiếm"], input[placeholder*="Search"]').first
                if search_input.count() > 0:
                    search_input.fill(title)
                    search_input.press("Enter")
                    time.sleep(2.5)
                
                # Tìm dòng có chứa tiêu đề
                row = page.locator(f'tr:has-text("{title}")').first
                if row.count() == 0:
                    # Nếu tiêu đề bị cắt ngắn, thử tìm một phần
                    short_title = title[:30]
                    row = page.locator(f'tr:has-text("{short_title}")').first
                
                if row.count() == 0:
                    print("Không tìm thấy bài viết để sửa!")
                    return False
                    
                # Click nút Sửa trong dòng đó
                edit_btn = row.locator('button[title*="Sửa"], a[title*="Sửa"], button:has-text("Sửa"), a:has-text("Sửa"), .fa-edit, .fa-pen').first
                if edit_btn.count() > 0:
                    edit_btn.click()
                else:
                    print("Không tìm thấy nút Sửa!")
                    return False
                
                page.wait_for_load_state("networkidle")
                time.sleep(2.5)
                
                print(f"[4/5] Đang cập nhật nội dung...")
                # Cập nhật danh mục
                try:
                    select_control = page.locator('.select__control, .css-fz8d9w-control, [class*="select__control"]').first
                    if select_control.count() > 0:
                        select_control.click()
                        time.sleep(0.8)
                        option = page.locator(f'.select__option:has-text("{location}"), [class*="select__option"]:has-text("{location}")')
                        if option.count() > 0:
                            option.first.click()
                            time.sleep(0.5)
                except Exception:
                    pass

                # Điền lại mô tả ngắn
                clean_text = re.sub('<[^<]+>', '', new_content)[:200] + "..."
                short_desc = page.locator('textarea[placeholder*="mô tả"], textarea[placeholder*="Mô tả"], textarea[name*="short"], textarea[name*="tom_tat"], textarea[name*="description"], label:has-text("Mô tả ngắn") + * textarea, label:has-text("Mô tả ngắn") ~ textarea')
                if short_desc.count() > 0:
                    short_desc.first.fill(clean_text)

                # Inject nội dung
                content_injected = self._inject_ckeditor_content(page, new_content)
                if not content_injected:
                    print("CẢNH BÁO: Không inject được nội dung mới!")

                print("[5/5] Đang lưu thay đổi...")
                submit_btn = page.locator('button[type="submit"], button:has-text("Lưu"), button:has-text("Cập nhật"), button:has-text("Save"), button:has-text("Đăng bài")').first
                if submit_btn.count() > 0:
                    submit_btn.click()
                else:
                    print("Không tìm thấy nút Lưu!")
                    return False

                time.sleep(5)
                print("✅ CẬP NHẬT BÀI VIẾT THÀNH CÔNG!")
                browser.close()
                return True

        except PlaywrightTimeoutError as e:
            print(f"TIMEOUT: {e}")
            return False
        except Exception as e:
            print(f"LỖI: {e}")
            return False
