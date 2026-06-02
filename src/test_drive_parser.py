import urllib.request
import re
import ssl
import json

folder_id = "1vR4GmNxQ-89lgNPg7wkDttsYB5BlIA-W"
url = f"https://drive.google.com/drive/folders/{folder_id}"

headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
context = ssl._create_unverified_context()

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=context, timeout=10) as response:
        html = response.read().decode('utf-8', errors='ignore')
        
        # Google Drive INITIAL_DATA parsing
        # Typically Google Drive folder items are in a script tag with: window._INITIAL_DATA_ or _INITIAL_DATA_
        # Let's search for matches of INITIAL_DATA or standard script content
        initial_data_matches = re.findall(r'_INITIAL_DATA_\s*=\s*(.*?);</script>', html, re.DOTALL)
        if not initial_data_matches:
            # Try finding matches for "window._INITIAL_DATA_ ="
            initial_data_matches = re.findall(r'window\._INITIAL_DATA_\s*=\s*(.*?);', html, re.DOTALL)
            
        print(f"INITIAL_DATA matches found: {len(initial_data_matches)}")
        
        # Let's write the first 5000 characters of matches if found
        if initial_data_matches:
            match_str = initial_data_matches[0][:5000]
            print("INITIAL_DATA Sample:")
            print(match_str[:1000])
        else:
            print("No INITIAL_DATA script block found.")
            
        # Let's search for standard Google Drive resource ID patterns: re: [a-zA-Z0-9_-]{33} or [a-zA-Z0-9_-]{28}
        # In Google Drive, IDs are usually 33 characters (e.g. 1vR4GmNxQ-89lgNPg7wkDttsYB5BlIA-W)
        # Let's scan for any strings of letters/numbers/dashes/underscores of length 33
        ids = set(re.findall(r'[a-zA-Z0-9_-]{33}', html))
        print(f"Total 33-char IDs found: {len(ids)}")
        # Filter for actual drive-like IDs that match user ones or have similar structure
        drive_ids = [i for i in ids if i.startswith('1') or i.startswith('0')]
        print(f"Sample Drive-like IDs: {drive_ids[:10]}")
        
except Exception as e:
    print(f"Error: {e}")
