import requests
import base64
import os
from typing import Optional

class WordPressClient:
    def __init__(self, wp_url: str, username: str, app_password: str):
        self.wp_url = wp_url.rstrip('/')
        self.api_url = f"{self.wp_url}/wp-json/wp/v2"
        self.username = username
        self.app_password = app_password
        
        credentials = f"{self.username}:{self.app_password}"
        token = base64.b64encode(credentials.encode()).decode('utf-8')
        self.headers = {
            'Authorization': f'Basic {token}',
            'Content-Type': 'application/json'
        }

    def upload_media(self, image_path: str) -> Optional[int]:
        """Upload an image to WordPress Media Library and return media ID."""
        url = f"{self.api_url}/media"
        filename = os.path.basename(image_path)
        
        try:
            with open(image_path, 'rb') as img_file:
                media_headers = self.headers.copy()
                media_headers['Content-Disposition'] = f'attachment; filename={filename}'
                media_headers.pop('Content-Type') # let requests set the content-type with boundary or use appropriate MIME
                
                # For direct file upload, we can specify Content-Type based on extension
                if filename.endswith('.jpg') or filename.endswith('.jpeg'):
                    media_headers['Content-Type'] = 'image/jpeg'
                elif filename.endswith('.png'):
                    media_headers['Content-Type'] = 'image/png'
                elif filename.endswith('.webp'):
                    media_headers['Content-Type'] = 'image/webp'
                    
                response = requests.post(url, headers=media_headers, data=img_file)
                response.raise_for_status()
                return response.json().get('id')
        except Exception as e:
            print(f"Error uploading media: {e}")
            return None

    def create_post(self, title: str, content: str, status: str = 'draft', 
                    categories: list = [], tags: list = [], featured_media_id: int = None) -> Optional[dict]:
        """Create a new WordPress post."""
        url = f"{self.api_url}/posts"
        
        data = {
            'title': title,
            'content': content,
            'status': status, # 'publish', 'draft', 'private', 'pending'
            'categories': categories,
            'tags': tags
        }
        
        if featured_media_id:
            data['featured_media'] = featured_media_id

        try:
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error creating post: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(e.response.text)
            return None

    def get_categories(self):
        """Fetch all categories from WordPress."""
        url = f"{self.api_url}/categories"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            return response.json()
        return []
        
    def get_tags(self):
        """Fetch all tags from WordPress."""
        url = f"{self.api_url}/tags"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            return response.json()
        return []
