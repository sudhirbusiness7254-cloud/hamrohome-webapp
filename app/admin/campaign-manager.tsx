"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, CalendarClock, ImagePlus, Loader2, Pencil, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { EmptyState, Skeleton } from "@/components/ui";
const inputCls = "w-full h-11 rounded-xl bg-slate-900 border border-slate-700 px-3.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none";
const btnPrimary = "h-11 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white hover:from-amber-500 hover:to-orange-600 transition-all disabled:opacity-50";

type Section = { id: string; key: string; title: string; subtitle: string | null; enabled: boolean; sortOrder: number };
type Banner = {
  id: string; title: string; subtitle: string | null; image: string | null;
  color: string; linkHref: string | null; position: string; sortOrder: number;
  isActive: boolean; startsAt: string | null; endsAt: string | null;
};
type BannerForm = {
  title: string; subtitle: string; image: string; linkHref: string; position: "hero" | "promo";
  color: string; isActive: boolean; startsAt: string; endsAt: string;
};

const blankBanner: BannerForm = {
  title: "", subtitle: "", image: "", linkHref: "/products",
  position: "hero", color: "#f59e0b", isActive: true, startsAt: "", endsAt: "",
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const two = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`;
}

function campaignStatus(b: Banner) {
  const now = Date.now();
  if (!b.isActive) return { label: "Paused", color: "#94a3b8" };
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return { label: "Scheduled", color: "#60a5fa" };
  if (b.endsAt && new Date(b.endsAt).getTime() <= now) return { label: "Ended", color: "#f87171" };
  return { label: "Live now", color: "#34d399" };
}

function BannerEditor({ original, onClose, onSaved, nextOrder }: {
  original: Banner | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<BannerForm>(original ? {
    title: original.title, subtitle: original.subtitle || "", image: original.image || "",
    linkHref: original.linkHref || "/products", position: original.position === "promo" ? "promo" : "hero",
    color: original.color, isActive: original.isActive,
    startsAt: toLocalInput(original.startsAt), endsAt: toLocalInput(original.endsAt),
  } : blankBanner);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File | null | undefined) => {
    if (!file) return;
    setError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP photo under 8 MB");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("purpose", "banner"); body.append("image", file);
      const res = await fetch("/api/media", { method: "POST", body, credentials: "same-origin" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Photo upload failed");
      setForm((x) => ({ ...x, image: json.data.url }));
    } catch (e) { setError(errMsg(e)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!form.image) { setError("Upload a banner photo before publishing"); return; }
    if (form.linkHref && (!form.linkHref.startsWith("/") || form.linkHref.startsWith("//"))) { setError("Link must start with / (an internal page)"); return; }
    if (form.startsAt && form.endsAt && new Date(form.startsAt) >= new Date(form.endsAt)) { setError("End time must be after start time"); return; }
    setSaving(true);
    try {
      await api("/api/admin/banners", { method: original ? "PATCH" : "POST", body: {
        ...(original ? { id: original.id } : { sortOrder: nextOrder }),
        title: form.title.trim(), subtitle: form.subtitle.trim() || null,
        image: form.image, linkHref: form.linkHref.trim() || null,
        position: form.position, color: form.color, isActive: form.isActive,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      } });
      onSaved();
    } catch (e) { setError(errMsg(e)); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-sm overflow-y-auto p-4 md:p-8" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving && !uploading) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={original ? "Edit homepage banner" : "Create homepage banner"} className="mx-auto max-w-2xl rounded-[24px] border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
      <div className="flex items-start justify-between px-6 py-5 border-b border-slate-700">
        <div><h3 className="text-lg font-black text-white">{original ? "Edit campaign" : "New campaign"}</h3><p className="text-xs text-slate-400 mt-0.5">Upload the photo people will see below the navigation bar.</p></div>
        <button onClick={onClose} type="button" aria-label="Close" className="h-9 w-9 rounded-xl hover:bg-slate-800 flex items-center justify-center"><X className="h-5 w-5 text-slate-400" /></button>
      </div>
      <form onSubmit={save} className="p-6 space-y-4">
        {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm font-semibold text-rose-300">{error}</div>}
        <div><label className="lbl">Campaign image *</label>
          {form.image ? <div className="relative aspect-[2.5/1] overflow-hidden rounded-xl bg-slate-800 border border-slate-700">
            <img src={form.image} alt="Campaign preview" className="h-full w-full object-cover" />
            <div className="absolute bottom-3 right-3 flex gap-2"><button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg bg-slate-950/90 px-3 py-1.5 text-xs font-bold text-white hover:text-amber-400 flex items-center gap-1"><ImagePlus className="h-3.5 w-3.5" /> Replace</button></div>
          </div> : <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full aspect-[2.5/1] rounded-xl border-2 border-dashed border-slate-600 hover:border-amber-400 bg-slate-800/60 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-amber-400 transition-colors disabled:opacity-50">
            {uploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <UploadCloud className="h-8 w-8" />}
            <span className="text-sm font-bold">{uploading ? "Uploading photo..." : "Click to upload a campaign image"}</span>
            <span className="text-xs">Landscape · at least 700 × 280 px · JPG, PNG or WebP · max 8 MB</span>
          </button>}
          <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose banner image" onChange={(e) => upload(e.target.files?.[0])} />
          <p className="text-[11px] text-slate-500 mt-1.5">The headline and button will be layered on top of the photo. Keep important details to the right.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label htmlFor="banner-title" className="lbl">Event / headline *</label><input id="banner-title" required minLength={2} maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="e.g. New season, new discoveries" /></div>
          <div className="sm:col-span-2"><label htmlFor="banner-subtitle" className="lbl">Short description</label><input id="banner-subtitle" maxLength={300} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className={inputCls} placeholder="A little more reason to browse..." /></div>
          <div><label htmlFor="banner-link" className="lbl">Shop button link</label><input id="banner-link" value={form.linkHref} onChange={(e) => setForm({ ...form, linkHref: e.target.value })} className={inputCls} placeholder="/products?sort=discount" /></div>
          <div><label htmlFor="banner-position" className="lbl">Placement</label><select id="banner-position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value as "hero" | "promo" })} className={inputCls}><option value="hero">Hero — below nav</option><option value="promo">Promo — below hero</option></select></div>
          <div><label htmlFor="banner-start" className="lbl">Start showing</label><input id="banner-start" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inputCls} /><p className="mt-1 text-[10px] text-slate-500">Blank = immediately</p></div>
          <div><label htmlFor="banner-end" className="lbl">Stop showing</label><input id="banner-end" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputCls} /><p className="mt-1 text-[10px] text-slate-500">Blank = no expiry</p></div>
        </div>
        <label className="flex gap-3 items-center rounded-xl border border-slate-700 p-3 cursor-pointer"><input type="checkbox" className="h-5 w-5 accent-amber-500" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /><span className="text-sm font-bold text-white">Enabled <span className="font-normal text-slate-500">— show this photo during its date range</span></span></label>
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="h-11 px-5 rounded-xl border border-slate-700 text-sm font-bold text-slate-300">Cancel</button><button disabled={!form.image || uploading || saving} className={`${btnPrimary} flex items-center gap-2`}>{saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : original ? "Save campaign" : "Publish campaign"}</button></div>
      </form>
    </div>
  </div>;
}

export function CmsTab() {
  const [sections, setSections] = useState<Section[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState<Banner | null | "new">(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const [secs, bands] = await Promise.all([
        api<{ sections: Section[] }>("/api/admin/sections"),
        api<{ banners: Banner[] }>("/api/admin/banners"),
      ]);
      setSections(secs.sections);
      setBanners(bands.banners);
    } catch (e) { setMessage(errMsg(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const saveSections = async () => {
    setSaving(true); setMessage("");
    try {
      await api("/api/admin/sections", { method: "PATCH", body: { sections: sections.map((s) => ({ id: s.id, title: s.title, subtitle: s.subtitle, enabled: s.enabled, sortOrder: s.sortOrder })) } });
      setMessage("Homepage sections saved. Refresh the storefront to see changes.");
    } catch (e) { setMessage(errMsg(e)); }
    finally { setSaving(false); }
  };

  const moveSection = (index: number, delta: number) => {
    const n = index + delta; if (n < 0 || n >= sections.length) return;
    const arr = [...sections]; [arr[index], arr[n]] = [arr[n], arr[index]];
    setSections(arr.map((x, i) => ({ ...x, sortOrder: i + 1 })));
  };

  const toggleBanner = async (banner: Banner) => {
    setBusy(banner.id); setMessage("");
    try {
      await api("/api/admin/banners", { method: "PATCH", body: { id: banner.id, isActive: !banner.isActive } });
      await load();
    } catch (e) { setMessage(errMsg(e)); }
    finally { setBusy(""); }
  };

  const deleteBanner = async (banner: Banner) => {
    if (!confirm(`Delete campaign “${banner.title}”? This cannot be undone.`)) return;
    setBusy(banner.id); setMessage("");
    try {
      await api(`/api/admin/banners?id=${banner.id}`, { method: "DELETE" });
      await load();
    } catch (e) { setMessage(errMsg(e)); }
    finally { setBusy(""); }
  };

  const moveBanner = async (banner: Banner, delta: number) => {
    const positionBanners = banners.filter((b) => b.position === banner.position).sort((a, b) => a.sortOrder - b.sortOrder);
    const index = positionBanners.findIndex((b) => b.id === banner.id);
    const other = positionBanners[index + delta]; if (!other) return;
    setBusy(banner.id); setMessage("");
    try {
      await api("/api/admin/banners", { method: "PATCH", body: { id: banner.id, sortOrder: other.sortOrder } });
      await api("/api/admin/banners", { method: "PATCH", body: { id: other.id, sortOrder: banner.sortOrder } });
      await load();
    } catch (e) { setMessage(errMsg(e)); }
    finally { setBusy(""); }
  };

  if (loading) return <Skeleton className="h-48 !bg-slate-800" />;
  return <div className="space-y-9">
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div><p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Storefront studio</p><h2 className="text-2xl font-black text-white mt-1">Homepage campaigns</h2><p className="text-sm text-slate-400 mt-1">Change the hero photo below the navigation, or schedule your next event in advance.</p></div>
        <button onClick={() => setEditing("new")} className={`${btnPrimary} flex items-center gap-2`}><Plus className="h-4 w-4" /> Add campaign</button>
      </div>
      {message && <div role="status" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{message}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        {banners.map((b) => {
          const status = campaignStatus(b);
          return <article key={b.id} className="rounded-2xl border border-slate-700/50 bg-slate-800/60 overflow-hidden hover:border-slate-600 transition-colors">
            <div className="relative aspect-[2.4/1] bg-slate-800">
              {b.image ? <img src={b.image} alt={b.title} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center"><ImagePlus className="h-10 w-10 text-slate-600" /></div>}
              <span className="absolute left-3 top-3 rounded-full bg-slate-950/85 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur-sm">{b.position === "hero" ? "HERO · BELOW NAV" : "PROMO STRIP"}</span>
              <span className="absolute right-3 top-3 rounded-full bg-slate-950/85 px-2.5 py-1 text-[10px] font-black backdrop-blur-sm" style={{ color: status.color }}>● {status.label}</span>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-bold text-white truncate">{b.title}</h3>
              <p className="text-xs text-slate-400 truncate mt-0.5">{b.subtitle || "No description"}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500"><CalendarClock className="h-3.5 w-3.5" /> {b.startsAt ? new Date(b.startsAt).toLocaleString() : "Now"} → {b.endsAt ? new Date(b.endsAt).toLocaleString() : "No end date"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-700/60 pt-3">
                <button onClick={() => setEditing(b)} className="h-8 px-3 rounded-lg bg-slate-700 text-[11px] font-bold text-white hover:bg-slate-600 flex items-center gap-1"><Pencil className="h-3 w-3" /> Edit photo / event</button>
                <button disabled={busy === b.id} onClick={() => toggleBanner(b)} className={`h-8 px-3 rounded-lg text-[11px] font-bold ${b.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700 text-slate-400"}`}>{b.isActive ? "Enabled" : "Paused"}</button>
                <button disabled={busy === b.id} onClick={() => moveBanner(b, -1)} aria-label="Move campaign earlier" className="h-8 w-8 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button disabled={busy === b.id} onClick={() => moveBanner(b, 1)} aria-label="Move campaign later" className="h-8 w-8 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button disabled={busy === b.id} onClick={() => deleteBanner(b)} aria-label="Delete campaign" className="ml-auto h-8 w-8 rounded-lg border border-rose-500/30 flex items-center justify-center text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </article>;
        })}
      </div>
      {banners.length === 0 && <EmptyState icon={<ImagePlus className="h-11 w-11" />} title="No campaigns yet" message="Add a photo and headline to create the first homepage campaign." />}
    </section>

    <section className="border-t border-slate-800 pt-7">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h2 className="text-lg font-black text-white">Homepage sections</h2><p className="text-xs text-slate-500 mt-1">Rename, enable or disable sections. Save when done.</p></div><button disabled={saving} onClick={saveSections} className={btnPrimary}>{saving ? "Saving..." : "Save sections"}</button></div>
      <div className="space-y-2">{sections.map((sec, index) => <div key={sec.id} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 flex flex-wrap sm:flex-nowrap items-center gap-2">
        <div className="flex items-center gap-1"><button onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label="Move section up" className="h-8 w-8 bg-slate-700 rounded-lg text-slate-300 disabled:opacity-30"><ArrowUp className="h-3 w-3 mx-auto" /></button><button onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1} aria-label="Move section down" className="h-8 w-8 bg-slate-700 rounded-lg text-slate-300 disabled:opacity-30"><ArrowDown className="h-3 w-3 mx-auto" /></button><button onClick={() => setSections(sections.map((x) => x.id === sec.id ? { ...x, enabled: !x.enabled } : x))} className={`h-8 px-2 rounded-lg text-[10px] font-black ${sec.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"}`}>{sec.enabled ? "ON" : "OFF"}</button></div>
        <div className="flex-1 grid sm:grid-cols-2 gap-2 min-w-[200px]"><input aria-label={`${sec.key} title`} value={sec.title} onChange={(e) => setSections(sections.map((x) => x.id === sec.id ? { ...x, title: e.target.value } : x))} className={`${inputCls} !h-9`} /><input aria-label={`${sec.key} subtitle`} value={sec.subtitle || ""} onChange={(e) => setSections(sections.map((x) => x.id === sec.id ? { ...x, subtitle: e.target.value } : x))} placeholder="Subtitle" className={`${inputCls} !h-9`} /></div>
        <span className="text-[10px] font-mono text-slate-600">{sec.key}</span>
      </div>)}</div>
    </section>
    {editing !== null && <BannerEditor key={typeof editing === "string" ? "new" : editing.id} original={typeof editing === "string" ? null : editing} nextOrder={Math.max(0, ...banners.map((b) => b.sortOrder)) + 1} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); setMessage("Campaign saved — the homepage reflects it immediately during the active dates."); await load(); }} />}
  </div>;
}
