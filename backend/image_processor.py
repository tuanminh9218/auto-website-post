import os
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import io

class ImageProcessor:
    def __init__(self, watermark_text: str = "mpuh.vn", output_dir: str = "temp_images"):
        self.watermark_text = watermark_text
        self.output_dir = output_dir
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    def _load_font(self, size: int):
        """Load font với fallback."""
        for font_path in ["arial.ttf", "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf"]:
            try:
                return ImageFont.truetype(font_path, size)
            except IOError:
                continue
        return ImageFont.load_default()

    def create_placeholder_image(self, title: str = "", width: int = 1200, height: int = 675) -> str:
        """
        Tạo ảnh placeholder 16:9 khi bài không có ảnh.
        Nền gradient xanh đậm, text "No Image" ở giữa cùng watermark mpuh.vn.
        """
        try:
            # Tạo nền gradient xanh đậm → xanh nhạt hơn
            img = Image.new("RGB", (width, height))
            draw = ImageDraw.Draw(img)

            # Vẽ gradient theo chiều dọc
            for y in range(height):
                ratio = y / height
                r = int(15 + ratio * 10)
                g = int(52 + ratio * 30)
                b = int(96 + ratio * 40)
                draw.line([(0, y), (width, y)], fill=(r, g, b))

            # Vẽ đường kẻ trang trí
            accent = (99, 179, 237)  # xanh nhạt
            draw.rectangle([0, 0, width - 1, 5], fill=accent)
            draw.rectangle([0, height - 6, width - 1, height - 1], fill=accent)
            draw.rectangle([0, 0, 5, height - 1], fill=accent)
            draw.rectangle([width - 6, 0, width - 1, height - 1], fill=accent)

            # --- Text "NO IMAGE" lớn ở giữa ---
            font_big = self._load_font(int(width * 0.1))
            text_main = "NO IMAGE"
            bbox = draw.textbbox((0, 0), text_main, font=font_big)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            x = (width - tw) // 2
            y = (height - th) // 2 - int(height * 0.06)

            # Shadow
            draw.text((x + 3, y + 3), text_main, font=font_big, fill=(0, 0, 0, 120))
            # Main text trắng
            draw.text((x, y), text_main, font=font_big, fill=(255, 255, 255))

            # --- Tiêu đề bài viết (nếu có) ---
            if title:
                font_title = self._load_font(int(width * 0.022))
                # Wrap text nếu quá dài
                max_chars = 80
                display_title = (title[:max_chars] + "...") if len(title) > max_chars else title
                t_bbox = draw.textbbox((0, 0), display_title, font=font_title)
                tw2 = t_bbox[2] - t_bbox[0]
                x2 = max(20, (width - tw2) // 2)
                y2 = y + th + int(height * 0.04)
                draw.text((x2 + 1, y2 + 1), display_title, font=font_title, fill=(0, 0, 0, 100))
                draw.text((x2, y2), display_title, font=font_title, fill=(200, 230, 255))

            # --- Watermark mpuh.vn góc dưới phải ---
            font_wm = self._load_font(int(width * 0.025))
            wm_text = self.watermark_text
            wm_bbox = draw.textbbox((0, 0), wm_text, font=font_wm)
            wm_w = wm_bbox[2] - wm_bbox[0]
            wm_h = wm_bbox[3] - wm_bbox[1]
            margin = int(width * 0.02)
            wm_x = width - wm_w - margin
            wm_y = height - wm_h - margin
            draw.text((wm_x + 1, wm_y + 1), wm_text, font=font_wm, fill=(0, 0, 0, 150))
            draw.text((wm_x, wm_y), wm_text, font=font_wm, fill=(255, 255, 255, 200))

            # Lưu file
            out_path = os.path.join(self.output_dir, "placeholder_no_image.jpg")
            img.save(out_path, "JPEG", quality=92)
            print(f"  Đã tạo ảnh placeholder: {out_path} ({width}x{height})")
            return out_path

        except Exception as e:
            print(f"Error creating placeholder image: {e}")
            return None

    def crop_to_ratio(self, image_path: str, ratio_w: int = 16, ratio_h: int = 9) -> str:
        """
        Center-crop ảnh về tỷ lệ chuẩn (mặc định 16:9).
        Tránh ảnh bị méo khi website hiển thị theo tỷ lệ cố định.
        """
        try:
            img = Image.open(image_path)
            orig_w, orig_h = img.size

            target_ratio = ratio_w / ratio_h
            current_ratio = orig_w / orig_h

            if abs(current_ratio - target_ratio) < 0.05:
                # Đã đúng tỷ lệ, không cần crop
                return image_path

            if current_ratio > target_ratio:
                # Ảnh quá rộng → crop 2 bên trái/phải
                new_w = int(orig_h * target_ratio)
                left = (orig_w - new_w) // 2
                img = img.crop((left, 0, left + new_w, orig_h))
            else:
                # Ảnh quá dọc → crop trên/dưới (giữ phần trên nhiều hơn)
                new_h = int(orig_w / target_ratio)
                top = int((orig_h - new_h) * 0.3)  # Giữ 30% từ trên xuống
                img = img.crop((0, top, orig_w, top + new_h))

            filename = os.path.basename(image_path)
            name, ext = os.path.splitext(filename)
            out_path = os.path.join(self.output_dir, f"{name}_cropped{ext}")

            if img.mode in ("RGBA", "P") and ext.lower() in ('.jpg', '.jpeg'):
                img = img.convert("RGB")
            img.save(out_path, quality=92)
            print(f"  Đã crop ảnh: {orig_w}x{orig_h} → {img.size[0]}x{img.size[1]} (tỷ lệ {ratio_w}:{ratio_h})")
            return out_path

        except Exception as e:
            print(f"Error cropping image: {e}")
            return image_path

    def add_watermark(self, image_path: str, position: str = 'bottom_right') -> str:
        """Add a watermark text to the image and save it."""
        try:
            image = Image.open(image_path).convert("RGBA")
            width, height = image.size
            
            txt = Image.new('RGBA', image.size, (255, 255, 255, 0))
            draw = ImageDraw.Draw(txt)
            
            font_size = max(int(width * 0.04), 16)
            try:
                font = ImageFont.truetype("arial.ttf", font_size)
            except IOError:
                try:
                    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", font_size)
                except IOError:
                    font = ImageFont.load_default()
            
            left, top, right, bottom = draw.textbbox((0, 0), self.watermark_text, font=font)
            textwidth = right - left
            textheight = bottom - top
            
            margin = int(width * 0.02)
            if position == 'bottom_right':
                x = width - textwidth - margin
                y = height - textheight - margin
            elif position == 'bottom_left':
                x = margin
                y = height - textheight - margin
            else:
                x = (width - textwidth) / 2
                y = (height - textheight) / 2
                
            # Shadow
            shadowcolor = (0, 0, 0, 160)
            draw.text((x-2, y-2), self.watermark_text, font=font, fill=shadowcolor)
            draw.text((x+2, y+2), self.watermark_text, font=font, fill=shadowcolor)
            # Main text
            fillcolor = (255, 255, 255, 200)
            draw.text((x, y), self.watermark_text, font=font, fill=fillcolor)
            
            watermarked = Image.alpha_composite(image, txt)
            final_img = watermarked.convert("RGB")
            
            filename = os.path.basename(image_path)
            name, ext = os.path.splitext(filename)
            out_path = os.path.join(self.output_dir, f"{name}_wm{ext}")
            final_img.save(out_path, quality=90)
            return out_path
            
        except Exception as e:
            print(f"Error adding watermark: {e}")
            return image_path

    def smart_resize(self, image_path: str,
                      max_width: int = 1200,
                      max_height: int = 900,
                      min_width: int = 600) -> str:
        """
        Resize ảnh giữ ĐÚNG tỷ lệ gốc (không crop, không méo).

        Logic:
        - Nếu ảnh đã nằm trong giới hạn [min_width..max_width] x [..max_height] → giữ nguyên.
        - Nếu rộng hơn max_width → thu nhỏ theo chiều rộng.
        - Nếu cao hơn max_height → thu nhỏ theo chiều cao.
        - Nếu nhỏ hơn min_width → phóng to vừa đủ min_width (không làm mờ nhỏ).
        - Tỷ lệ (w/h) gốc luôn được bảo toàn.
        """
        try:
            img = Image.open(image_path)

            # Convert mode trước khi xử lý
            if img.mode in ('RGBA', 'P', 'LA'):
                bg = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                bg.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = bg
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            orig_w, orig_h = img.size
            aspect = orig_w / orig_h  # giữ tỷ lệ này xưừt suốt

            new_w, new_h = orig_w, orig_h

            # Ứu tiên: đảm bảo không vượt max_width
            if new_w > max_width:
                new_w = max_width
                new_h = int(new_w / aspect)

            # Sau đó: đảm bảo không vượt max_height
            if new_h > max_height:
                new_h = max_height
                new_w = int(new_h * aspect)

            # Cuối: nếu vẫn quá nhỏ thì phóng to lên min_width
            if new_w < min_width:
                new_w = min_width
                new_h = int(new_w / aspect)

            # Chỉ resize khi cần
            if (new_w, new_h) != (orig_w, orig_h):
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                print(f"  Resize: {orig_w}x{orig_h} → {new_w}x{new_h} (tỷ lệ {aspect:.2f}:1 giữ nguyên)")
            else:
                print(f"  Giữ nguyên kích thước: {orig_w}x{orig_h}")

            filename = os.path.basename(image_path)
            name, ext = os.path.splitext(filename)
            # Luôn xuất ra JPEG cho nhẹ
            out_path = os.path.join(self.output_dir, f"{name}_resized.jpg")
            img.save(out_path, 'JPEG', quality=92, optimize=True)
            return out_path

        except Exception as e:
            print(f"Error smart_resize: {e}")
            return image_path

    def process_and_resize(self, image_path: str, max_width: int = 1200) -> str:
        """
        Resize ảnh về max_width, giữ tỷ lệ khung hình.
        Không phóng to ảnh nhỏ hơn max_width.
        """
        try:
            img = Image.open(image_path)
            
            if img.width > max_width:
                new_width = max_width
                new_height = int((max_width / img.width) * img.height)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
            filename = os.path.basename(image_path)
            name, ext = os.path.splitext(filename)
            out_path = os.path.join(self.output_dir, f"{name}_resized{ext}")
            
            if img.mode in ("RGBA", "P") and ext.lower() in ('.jpg', '.jpeg'):
                img = img.convert("RGB")
                
            img.save(out_path, quality=92)
            return out_path

        except Exception as e:
            print(f"Error resizing image: {e}")
            return image_path

    def full_process(self, image_path: str,
                     max_width: int = 1200,
                     max_height: int = 900,
                     min_width: int = 600) -> str:
        """
        Pipeline chuẩn cho ảnh bài viết:
          Resize thông minh (giữ tỷ lệ gốc) → Watermark

        KHÔNG crop cứng tỷ lệ 16:9 — luôn giữ đúng tỷ lệ gốc của ảnh nguồn.
        """
        # Bước 1: Resize thông minh, giữ tỷ lệ
        resized = self.smart_resize(image_path, max_width=max_width,
                                    max_height=max_height, min_width=min_width)
        # Bước 2: Đóng dấu watermark
        watermarked = self.add_watermark(resized)
        return watermarked
