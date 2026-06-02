import urllib.request
import re
import ssl

folder_id = "1vR4GmNxQ-89lgNPg7wkDttsYB5BlIA-W"
url = f"https://drive.google.com/drive/folders/{folder_id}"

headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
context = ssl._create_unverified_context()

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=context, timeout=10) as response:
        html = response.read().decode('utf-8', errors='ignore')
        
        # Let's search for drive IDs in the page and print the surrounding characters
        ids = ['1vR4GmNxQ-89lgNPg7wkDttsYB5BlIA-W', '107xmjddeSPULM7ldYsypjnhNNNN9seSb', '1Ls2PPJutrqb-ccWk-OT3br7q9lcR8ToZ', '1mvyjoWUHkCXgvynanireUog3M3BQCABv', '1huXMzVXSXvZn-C3OYhV-Lg3sUurpWJ8T', '1m6JsXw3Z6Uwmh9lF6qiBKnI5pi4-i9NX', '1bijEpBayrrhTL2oDSkr9cogYnZkNh7YI', '1b85RYP-2Nz00lQNpOlrRCeMXa7tM0F3U']
        
        # Let's print any matches in the page for these IDs
        for target in ids:
            matches = [m.start() for m in re.finditer(re.escape(target), html)]
            print(f"ID: {target} -> found {len(matches)} times")
            for idx in matches[:2]:
                start = max(0, idx - 100)
                end = min(len(html), idx + 200)
                snippet = html[start:end]
                print(f"  Snippet: ... {snippet} ...")
                
except Exception as e:
    print(f"Error: {e}")
