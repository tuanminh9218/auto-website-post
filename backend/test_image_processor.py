import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from image_processor import ImageProcessor
from PIL import Image

proc = ImageProcessor()

# Tạo ảnh test với nhiều tỷ lệ khác nhau để kiểm tra
test_cases = [
    ("1920x1080",  1920, 1080),  # Ngang lớn (16:9)
    ("450x720",    450,  720),   # Dọc (portrait) - hay bị méo cũ
    ("800x600",    800,  600),   # 4:3
    ("300x300",    300,  300),   # Vuông nhỏ (cần upscale)
    ("2000x3000",  2000, 3000),  # Dọc lớn
    ("640x360",    640,  360),   # Ngang nhỏ 16:9
]

print("=" * 70)
print(f"{'TÊN':<15} {'GỐC':>12} {'SAU RESIZE':>15} {'TỶ LỆ GỐC':>12} {'TỶ LỆ SAU':>12} {'GIỮ?':>6}")
print("=" * 70)

for name, w, h in test_cases:
    # Tạo ảnh test
    test_path = f"temp_images/test_{name}.jpg"
    img = Image.new("RGB", (w, h), color=(100 + w % 100, 100, 150))
    img.save(test_path, "JPEG")

    # Chạy smart_resize
    result_path = proc.smart_resize(test_path)

    # Đọc kết quả
    result_img = Image.open(result_path)
    rw, rh = result_img.size

    orig_ratio = w / h
    new_ratio = rw / rh
    ratio_ok = abs(orig_ratio - new_ratio) < 0.02  # Cho phép sai số 2%

    print(f"{name:<15} {w:>5}x{h:<5}  {rw:>6}x{rh:<6}  {orig_ratio:>10.3f}  {new_ratio:>10.3f}  {'✅' if ratio_ok else '❌'}")

    # Dọn dẹp file test
    os.remove(test_path)
    os.remove(result_path)

print("=" * 70)
print("\nKiểm tra ảnh thực từ Dantri...")

# Test với ảnh thực đã download
dantri_imgs = [f for f in os.listdir("temp_images") if "dantri" in f.lower() or "cdnphoto" in f.lower() or "1778" in f]
if dantri_imgs:
    test_img = os.path.join("temp_images", dantri_imgs[0])
    orig = Image.open(test_img)
    print(f"\nẢnh gốc: {dantri_imgs[0]}")
    print(f"  Kích thước gốc: {orig.size[0]}x{orig.size[1]} (tỷ lệ {orig.size[0]/orig.size[1]:.3f}:1)")

    result = proc.full_process(test_img)
    result_img = Image.open(result)
    print(f"  Sau full_process: {result_img.size[0]}x{result_img.size[1]} (tỷ lệ {result_img.size[0]/result_img.size[1]:.3f}:1)")
    print(f"  File: {result}")
    print("  ✅ Tỷ lệ giữ nguyên!" if abs(orig.size[0]/orig.size[1] - result_img.size[0]/result_img.size[1]) < 0.02 else "  ❌ Tỷ lệ bị thay đổi!")
else:
    print("Không tìm thấy ảnh từ Dantri trong temp_images/")
    print("Các ảnh hiện có:", os.listdir("temp_images")[:5])
