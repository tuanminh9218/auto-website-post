import sqlite3, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('autoposter.db')
c = conn.cursor()
c.execute("SELECT id, title, image_path, status FROM posts ORDER BY id DESC LIMIT 15")
rows = c.fetchall()
for r in rows:
    img = str(r[2]) if r[2] else "NO_IMAGE"
    print(f"ID={r[0]} status={r[3]} img={img[:70]}")
conn.close()
