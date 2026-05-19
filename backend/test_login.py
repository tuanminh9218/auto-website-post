import requests
import base64
import sys
import json

def test_login():
    url = "https://mpuh.vn/wp-json/wp/v2/users/me"
    token = base64.b64encode(b'autoposter:123456').decode()
    headers = {'Authorization': f'Basic {token}'}
    
    try:
        res = requests.get(url, headers=headers)
        print(f"Status Code: {res.status_code}")
        
        # Try to parse as JSON
        try:
            data = res.json()
            if res.status_code == 200:
                print("Login successful!")
                print(f"Logged in as: {data.get('name')} (ID: {data.get('id')})")
            else:
                print("Login failed via REST API. Basic Auth might be blocked or credentials wrong.")
                print(json.dumps(data, indent=2, ensure_ascii=False))
        except json.JSONDecodeError:
            print("Response is not JSON. Maybe blocked by firewall or HTML page returned.")
            # print first 200 chars
            print(res.text[:200])
            
    except Exception as e:
        print(f"Error connecting: {e}")

if __name__ == "__main__":
    # Force utf-8 stdout
    sys.stdout.reconfigure(encoding='utf-8')
    test_login()
