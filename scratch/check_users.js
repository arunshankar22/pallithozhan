const apiKey = "AIzaSyBjdndDGmh4ZQt_SJRf8_aL0QtBgidGMUw";
const url = `https://firestore.googleapis.com/v1/projects/pallithozhan/databases/pallithozhandb/documents/users?key=${apiKey}&pageSize=300`;

async function main() {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("HTTP error:", res.status, await res.text());
      return;
    }
    const data = await res.json();
    if (!data.documents) {
      console.log("No users found in collection.");
      return;
    }
    console.log(`Found ${data.documents.length} users.`);
    const names = data.documents.map(d => {
      const fields = d.fields || {};
      const fullName = fields.fullName?.stringValue || "";
      const email = fields.email?.stringValue || "";
      const role = fields.role?.stringValue || "";
      return { id: d.name.split("/").pop(), fullName, email, role };
    });
    console.log("Users:", names);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

main();
