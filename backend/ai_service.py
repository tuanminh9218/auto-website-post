import os
import requests
import json

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        # Using the specified default model
        self.model = "nano-banana-2-001"
        self.base_url = "https://generativelanguage.googleapis.com/v1"

    def rewrite_content(self, html_content: str) -> str:
        if not self.api_key:
            print("No GEMINI_API_KEY found, skipping rewrite.")
            return html_content
            
        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        
        prompt = (
            "Bạn là một biên tập viên y khoa chuyên nghiệp. Hãy viết lại nội dung bài viết dưới đây "
            "sao cho văn phong tự nhiên, hấp dẫn, chuẩn SEO và tuyệt đối không giống bản gốc để tránh lỗi trùng lặp (đạo văn). "
            "Tuyệt đối KHÔNG giữ lại bất kỳ lời kêu gọi nào liên quan đến 'Theo dõi trên Google News' hay các thông điệp quảng cáo nguồn báo khác. "
            "Bạn PHẢI trả về định dạng HTML (có các thẻ <p>, <h2>, <h3>, <strong>...) để phù hợp hiển thị trên web. "
            "Hãy giữ lại các thông tin y khoa chính xác. Bắt đầu bằng một đoạn tóm tắt 2-3 câu.\n\n"
            f"NỘI DUNG GỐC:\n{html_content}"
        )
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        
        headers = {"Content-Type": "application/json"}
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            rewritten = data["candidates"][0]["content"]["parts"][0]["text"]
            
            # Clean markdown block formatting if Gemini returns it
            if rewritten.startswith("```html"):
                rewritten = rewritten[7:-3]
            elif rewritten.startswith("```"):
                rewritten = rewritten[3:-3]
                
            return rewritten.strip()
        except Exception as e:
            print(f"Gemini API Error: {e}")
            # If error, return original content
            return html_content
