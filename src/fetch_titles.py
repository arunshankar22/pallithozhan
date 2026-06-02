import urllib.request
import re
import ssl

links = [
    "https://drive.google.com/open?id=1vR4GmNxQ-89lgNPg7wkDttsYB5BlIA-W",
    "https://drive.google.com/open?id=107xmjddeSPULM7ldYsypjnhNNNN9seSb",
    "https://drive.google.com/open?id=1Ls2PPJutrqb-ccWk-OT3br7q9lcR8ToZ",
    "https://drive.google.com/open?id=1mvyjoWUHkCXgvynanireUog3M3BQCABv",
    "https://drive.google.com/open?id=1huXMzVXSXvZn-C3OYhV-Lg3sUurpWJ8T",
    "https://drive.google.com/open?id=1m6JsXw3Z6Uwmh9lF6qiBKnI5pi4-i9NX",
    "https://drive.google.com/open?id=1bijEpBayrrhTL2oDSkr9cogYnZkNh7YI",
    "https://drive.google.com/open?id=1b85RYP-2Nz00lQNpOlrRCeMXa7tM0F3U"
]

print("Fetching file/folder titles from Google Drive open links...")
headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
context = ssl._create_unverified_context()

for link in links:
    try:
        req = urllib.request.Request(link, headers=headers)
        with urllib.request.urlopen(req, context=context, timeout=8) as response:
            html = response.read().decode('utf-8', errors='ignore')
            title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
            if title_match:
                title = title_match.group(1).replace(" - Google Drive", "").strip()
                print(f"URL: {link} -> TITLE: {title}")
            else:
                print(f"URL: {link} -> No title found")
    except Exception as e:
        print(f"URL: {link} -> Error: {e}")
