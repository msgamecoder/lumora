// lumora.js
    //http://localhost:5000
const primaryAPI = "https://lumora-usrb.onrender.com";
const backupAPI = "https://lumoraa.onrender.com";

async function lumora(path, data = null) {
  const cleanedPath = path.replace(/^\/+/, "");
  const isPost = data && typeof data === "object" && Object.keys(data).length > 0;

  const buildOptions = (signal) => ({
    method: isPost ? "POST" : "GET",
    headers: isPost ? { "Content-Type": "application/json" } : undefined,
    body: isPost ? JSON.stringify(data) : undefined,
    signal
  });

  const tryFetch = async (url, timeoutMs) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, buildOptions(controller.signal));
      clearTimeout(timeout);

      let json;
      try {
        json = await res.json(); // Try parse response
      } catch (err) {
        console.warn("⚠️ Failed to parse JSON:", err.message || err.name);
        return { ok: false, message: "❌ Invalid server response." };
      }

      return { ok: res.ok, ...json };
    } catch (err) {
      clearTimeout(timeout);
      console.error("🚨 Fetch error:", err.message || err.name);
      throw err;
    }
  };

  try {
    const result = await tryFetch(`${primaryAPI}/${cleanedPath}`, 15000);
   if (result) {
  if (result.ok === false) {
    // This means server responded but with an actual error (like 400)
    return result; // 👈 Don't fall back, show real error
  }
  return result;
}
  } catch (err) {
    console.warn("🕐 Primary API failed:", err.message || err.name);
  }

  // Wait 3s before trying backup
  await new Promise((res) => setTimeout(res, 3000));

  try {
    const result = await tryFetch(`${backupAPI}/${cleanedPath}`, 8000);
    if (result && result.ok !== false) return result;
  } catch (finalErr) {
    console.error("❌ Backup API failed:", finalErr.message || finalErr.name);
  }

  return {
    ok: false,
    message: "🚧 Lumora is temporarily offline. Try again later."
  };
}
