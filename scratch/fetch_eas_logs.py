import subprocess
import json
import urllib.request
import gzip
import io
import ssl
import zlib

def main():
    print("Running eas build:view...")
    result = subprocess.run(
        ["npx", "eas", "build:view", "7e9ef53a-d0aa-481c-a8a3-f642f938724e", "--json"],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print("EAS command failed:", result.stderr)
        return
        
    try:
        build_data = json.loads(result.stdout)
    except Exception as e:
        print("Failed to parse JSON:", e)
        return
        
    log_urls = build_data.get("logFiles", [])
    if not log_urls:
        print("No log URLs found.")
        return
        
    url = log_urls[0]
    
    req = urllib.request.Request(
        url,
        headers={"Accept-Encoding": "gzip, deflate"}
    )
    
    context = ssl._create_unverified_context()
    
    try:
        with urllib.request.urlopen(req, context=context) as response:
            content = response.read()
            print("Response Headers:", dict(response.info()))
            print("First 20 bytes in hex:", content[:20].hex())
            
            # Let's try raw gzip decompression
            try:
                print("Trying gzip decompression...")
                with gzip.GzipFile(fileobj=io.BytesIO(content)) as f:
                    decompressed = f.read()
                    print("Gzip successful. Size:", len(decompressed))
                    content = decompressed
            except Exception as e_gz:
                print("Gzip failed:", e_gz)
                
                # Let's try zlib decompression
                try:
                    print("Trying zlib decompression...")
                    decompressed = zlib.decompress(content)
                    print("Zlib successful. Size:", len(decompressed))
                    content = decompressed
                except Exception as e_zl:
                    print("Zlib failed:", e_zl)
                    
                    # Let's try zlib with wbits=-15 (raw deflate)
                    try:
                        print("Trying raw deflate decompression...")
                        decompressed = zlib.decompress(content, -zlib.MAX_WBITS)
                        print("Raw deflate successful. Size:", len(decompressed))
                        content = decompressed
                    except Exception as e_df:
                        print("Raw deflate failed:", e_df)
            
            log_text = content.decode('utf-8', errors='ignore')
            with open("scratch/eas_build_log_plain.txt", "w", encoding="utf-8") as out_f:
                out_f.write(log_text)
                
            lines = log_text.splitlines()
            print(f"\n--- LAST 10 LINES ---")
            for line in lines[-10:]:
                print(line)
                
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
