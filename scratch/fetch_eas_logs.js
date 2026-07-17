const { execSync } = require('child_process');
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');

function main() {
  console.log("Running eas build:view...");
  let stdout;
  try {
    stdout = execSync("npx eas build:view 7e9ef53a-d0aa-481c-a8a3-f642f938724e --json", { encoding: 'utf-8' });
  } catch (err) {
    console.error("EAS command failed:", err.message);
    return;
  }

  let buildData;
  try {
    buildData = JSON.parse(stdout);
  } catch (err) {
    console.error("Failed to parse JSON:", err.message);
    return;
  }

  const logUrls = buildData.logFiles;
  if (!logUrls || logUrls.length === 0) {
    console.error("No log URLs found.");
    return;
  }

  const url = logUrls[0];
  console.log("Fetching logs from:", url.substring(0, 100) + "...");

  https.get(url, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const buffer = Buffer.concat(chunks);
      console.log("Downloaded", buffer.length, "bytes. Content-Encoding:", res.headers['content-encoding']);

      // Check if Brotli compressed
      if (res.headers['content-encoding'] === 'br' || buffer[0] === 0x0b) {
        console.log("Decompressing Brotli content...");
        zlib.brotliDecompress(buffer, (err, decompressed) => {
          if (err) {
            console.error("Brotli decompression failed:", err.message);
            return;
          }
          saveAndPrintLogs(decompressed.toString('utf-8'));
        });
      } else if (res.headers['content-encoding'] === 'gzip' || (buffer[0] === 0x1f && buffer[1] === 0x8b)) {
        console.log("Decompressing Gzip content...");
        zlib.gunzip(buffer, (err, decompressed) => {
          if (err) {
            console.error("Gzip decompression failed:", err.message);
            return;
          }
          saveAndPrintLogs(decompressed.toString('utf-8'));
        });
      } else {
        console.log("Content is not compressed.");
        saveAndPrintLogs(buffer.toString('utf-8'));
      }
    });
  }).on('error', (err) => {
    console.error("HTTPS request failed:", err.message);
  });
}

function saveAndPrintLogs(logText) {
  const outPath = "scratch/eas_build_log_plain.txt";
  fs.writeFileSync(outPath, logText, 'utf-8');
  console.log("Successfully wrote plain logs to:", outPath);

  const lines = logText.split('\n');
  console.log(`\n--- LAST 40 LINES OF LOG (Total lines: ${lines.length}) ---`);
  
  // Let's print the last 40 lines.
  const lastLines = lines.slice(-40);
  lastLines.forEach(line => {
    if (!line.trim()) return;
    try {
      const data = JSON.parse(line);
      console.log(`[${data.phase || 'LOG'}] ${data.msg || ''}`);
    } catch (err) {
      console.log(line);
    }
  });
}

main();
