import urllib.request
import re
import ssl
import json

folder_id = "1vR4GmNxQ-89lgNPg7wkDttsYB5BlIA-W" # Let's test the first ID
url = f"https://drive.google.com/drive/folders/{folder_id}"

headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
context = ssl._create_unverified_context()

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=context, timeout=10) as response:
        html = response.read().decode('utf-8', errors='ignore')
        print(f"HTML Length: {len(html)}")
        
        # Look for standard JSON bootstrap data injected in the page
        # In Google Drive folder pages, there's usually a block like `window._INITIAL_DATA_ = ...` or `ytInitialData` or similar bootstrap data
        # Let's search for matches of files and IDs in the page
        
        # Google Drive usually injects JSON data in script tags, containing lists of files.
        # Let's search for file patterns or the other IDs the user provided to see if they appear in this folder!
        ids_to_check = [
            "107xmjddeSPULM7ldYsypjnhNNNN9seSb",
            "1Ls2PPJutrqb-ccWk-OT3br7q9lcR8ToZ",
            "1mvyjoWUHkCXgvynanireUog3M3BQCABv",
            "1huXMzVXSXvZn-C3OYhV-Lg3sUurpWJ8T",
            "1m6JsXw3Z6Uwmh9lF6qiBKnI5pi4-i9NX",
            "1bijEpBayrrhTL2oDSkr9cogYnZkNh7YI",
            "1b85RYP-2Nz00lQNpOlrRCeMXa7tM0F3U"
        ]
        
        for check_id in ids_to_check:
            found = check_id in html
            print(f"ID {check_id} found in folder HTML? {found}")
            
except Exception as e:
    print(f"Error fetching folder HTML: {e}")
