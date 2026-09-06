(() => {
  const C = window.MEDIAFORGE_CONFIG || {};
  const $ = id => document.getElementById(id);
  const urlEl = $("url"), result = $("result"), status = $("status");

  $("waTop").href = `https://wa.me/${String(C.DEVELOPER_WHATSAPP || "").replace(/\D/g,"")}`;

  if (C.BACKGROUND_MUSIC) {
    $("bgMusic").src = C.BACKGROUND_MUSIC;
    document.addEventListener("click", () => $("bgMusic").play().catch(()=>{}), {once:true});
  }

  $("themeBtn").onclick = () => document.body.classList.toggle("light");

  $("pasteBtn").onclick = async () => {
    try {
      urlEl.value = await navigator.clipboard.readText();
      toast("URL ditempel.");
    } catch { toast("Clipboard tidak tersedia. Tempel manual."); }
  };

  $("analyzeBtn").onclick = async () => {
    const url = urlEl.value.trim();
    if (!/^https?:\\/\\//i.test(url)) return toast("Masukkan URL yang valid.");
    setStatus("Menganalisis URL…");
    result.classList.remove("hidden");

    try {
      const data = await api("/api/info", {url});
      renderInfo(data, url);
      addHistory(url, data.title || "Media");
      setStatus("Siap diunduh. Pilih format dan kualitas.");
    } catch (e) {
      // Fallback UI tetap bekerja jika backend belum dipasang.
      renderInfo({title:"Media siap diproses", platform:detectPlatform(url), thumbnail:""}, url);
      setStatus("Backend belum terhubung. Hubungkan API_BASE_URL di config.js.");
    }
  };

  $("format").onchange = () => {
    const audio = $("format").value === "audio";
    $("qualityWrap").style.display = audio ? "none" : "";
    $("audioWrap").style.display = audio ? "" : "none";
  };
  $("format").dispatchEvent(new Event("change"));

  $("downloadBtn").onclick = async () => {
    const url = urlEl.value.trim();
    if (!url) return toast("Masukkan URL terlebih dahulu.");
    const payload = {
      url,
      format: $("format").value,
      quality: $("quality").value,
      audioFormat: $("audioFormat").value
    };
    setStatus("Menyiapkan file…");
    try {
      const res = await fetch(apiUrl("/api/download"), {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^"]+)"?/i);
      const name = match ? match[1] : `mediaforge-${Date.now()}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href), 3000);
      setStatus("Download selesai.");
    } catch (e) {
      setStatus("Gagal: backend tidak tersedia atau URL tidak dapat diproses.");
    }
  };

  function renderInfo(data, url) {
    $("title").textContent = data.title || "Media";
    $("platform").textContent = (data.platform || detectPlatform(url)).toUpperCase();
    $("info").textContent = data.duration ? `${data.duration} • Media tersedia` : "Media terdeteksi";
    const thumb = $("thumb");
    if (data.thumbnail) thumb.innerHTML = `<img src="${escapeHtml(data.thumbnail)}" alt="Thumbnail">`;
    else thumb.innerHTML = `<span>${(data.platform || "MEDIA").toUpperCase()}</span>`;
  }

  function detectPlatform(u) {
    try {
      const h = new URL(u).hostname.toLowerCase();
      if (h.includes("youtube") || h.includes("youtu.be")) return "YouTube";
      if (h.includes("tiktok")) return "TikTok";
      if (h.includes("instagram")) return "Instagram";
      if (h.includes("facebook") || h.includes("fb.watch")) return "Facebook";
    } catch {}
    return "Media";
  }

  async function api(path, body) {
    const r = await fetch(apiUrl(path), {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)});
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
  function apiUrl(path) { return `${String(C.API_BASE_URL || "").replace(/\\/$/,"")}${path}`; }
  function setStatus(t) { status.textContent = t; }
  function toast(t) { setStatus(t); result.classList.remove("hidden"); }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function addHistory(url,title) {
    const h = JSON.parse(localStorage.getItem("mf_history") || "[]");
    h.unshift({url,title,at:new Date().toLocaleString("id-ID")});
    localStorage.setItem("mf_history", JSON.stringify(h.slice(0,10)));
    renderHistory();
  }
  function renderHistory() {
    const h = JSON.parse(localStorage.getItem("mf_history") || "[]");
    $("historyList").innerHTML = h.length ? h.map(x => `<div class="history-item"><div><b>${escapeHtml(x.title)}</b><small>${escapeHtml(x.url)}</small></div><span>${escapeHtml(x.at)}</span></div>`).join("") : '<p class="muted">Belum ada riwayat.</p>';
  }
  $("clearHistory").onclick = () => { localStorage.removeItem("mf_history"); renderHistory(); };
  renderHistory();
})();
