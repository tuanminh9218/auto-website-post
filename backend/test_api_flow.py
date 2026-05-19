import requests
import time

API_BASE = "http://localhost:8000/api"

def test_flow():
    print("1. Triggering scrape...")
    res = requests.post(f"{API_BASE}/scrape", json={
        "url": "https://suckhoedoisong.vn/y-hoc-360.htm",
        "limit": 1,
        "auto_post": False
    })
    print(res.json())

    print("Waiting 15 seconds for scraping to finish...")
    time.sleep(15)

    print("2. Fetching posts...")
    res = requests.get(f"{API_BASE}/posts")
    posts = res.json()
    print(f"Found {len(posts)} posts.")
    
    if not posts:
        print("No posts found. Exiting.")
        return

    first_post = posts[0]
    print(f"Latest post: {first_post['title']} (Status: {first_post['status']})")
    
    if first_post['status'] == 'pending':
        print(f"3. Triggering Publish Now for Post ID {first_post['id']}...")
        res = requests.post(f"{API_BASE}/posts/{first_post['id']}/publish")
        print(res.json())

if __name__ == "__main__":
    try:
        test_flow()
    except Exception as e:
        print(f"Ensure the backend is running (uvicorn main:app --port 8000). Error: {e}")
