"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ImagePlus, Plus, X, Trash2, ArrowLeft, ArrowRight, UploadCloud, Loader2, BadgeCheck, AlertCircle, ExternalLink } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { formatNPR } from "@/lib/format";
import { Skeleton, EmptyState } from "@/components/ui";

export type VProduct = {
  id: string; vendorId: string; name: string; slug: string; sku: string; price: number; salePrice: number | null;
  stock: number; reservedStock: number; status: string; soldCount: number; ratingAvg: string;
  categoryName: string | null; brandName: string | null; rejectionReason: string | null;
  categoryId: string | null; brandId: string | null; shortDescription: string | null; description: string | null;
  lowStockThreshold: number; warranty: string | null; returnPolicy: string | null; tags: string[];
  images: { id: string; url: string; alt: string | null; sortOrder: number }[];
  variants: { id: string; color: string | null; size: string | null; sku: string; price: number | null; stock: number; imageColor: string | null }[];
};
export type Facet = { id: string; name: string; slug: string };
export type SellerOption = { userId: string; shopName: string; slug: string };

export const inputCls = "w-full h-11 rounded-xl bg-slate-900 border border-slate-700 px-3.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none";
export const btnPrimary = "h-11 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-bold text-white hover:from-amber-500 hover:to-orange-600 transition-all disabled:opacity-50";
const STATUS_COLOR: Record<string, string> = { pending: "#f59e0b", approved: "#10b981", rejected: "#ef4444", archived: "#64748b" };

type VRow = { id?: string; color: string; size: string; sku: string; price: string; stock: string; imageColor: string };

export function ProductsTab({ approved }: { approved: boolean }) {
  const [products, setProducts] = useState<VProduct[]>([]);
  const [cats, setCats] = useState<Facet[]>([]);
  const [brands, setBrands] = useState<Facet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VProduct | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const d = await api<{ products: VProduct[]; categories: Facet[]; brands: Facet[] }>("/api/vendor/products");
      setProducts(d.products);
      setCats(d.categories);
      setBrands(d.brands);
      setError("");
    } catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const archive = async (id: string) => {
    if (!confirm("Archive this product? It will be hidden from the store.")) return;
    try {
      await api(`/api/vendor/products?id=${id}`, { method: "DELETE" });
      await load();
    } catch (e) { setError(errMsg(e)); }
  };
  const list = filter ? products.filter((p) => p.status === filter) : products;

  if (loading) return <div className="space-y-3"><Skeleton className="h-24 !bg-slate-800" /></div>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">My products <span className="text-slate-500">({products.length})</span></h2>
          <p className="text-xs text-slate-500 mt-1">Your new listings go live only after admin approval.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs font-bold text-white">
            <option value="">All statuses</option>
            <option value="pending">Awaiting review</option>
            <option value="approved">Live</option>
            <option value="rejected">Needs changes</option>
            <option value="archived">Archived</option>
          </select>
          <button disabled={!approved} onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-xs font-bold text-white disabled:opacity-40">
            <Plus className="h-4 w-4" /> Add product
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {!approved && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">Your shop is awaiting approval. You can list products once your seller account is approved.</div>}

      {showForm && <ProductForm
        mode="vendor" categories={cats} brands={brands} editing={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={async () => { setShowForm(false); setEditing(null); setFilter(""); await load(); }}
      />}

      {list.length === 0 ? (
        <EmptyState icon={<ImagePlus className="h-12 w-12" />} title="No products here" message={filter ? "No products match this status." : "Add a product with photos to start selling."} />
      ) : (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-700/50">
                <th className="px-4 py-3">Listing</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Available</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-700/40">
                {list.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? <img src={p.images[0].url} alt={p.name} className="h-14 w-14 rounded-xl object-cover bg-slate-700 flex-shrink-0" /> : <span className="h-14 w-14 rounded-xl bg-slate-700 flex items-center justify-center"><ImagePlus className="h-5 w-5 text-slate-500" /></span>}
                        <div className="min-w-0"><p className="font-bold text-white max-w-[270px] truncate">{p.name}</p>
                          <p className="text-[11px] text-slate-500">{p.sku} · {p.categoryName || "No category"} · {p.images?.length ?? 0} photos</p>
                          {p.status === "rejected" && p.rejectionReason && <p className="text-[11px] text-rose-400">Changes needed: {p.rejectionReason}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><p className="font-bold text-white">{formatNPR(p.salePrice ?? p.price)}</p>{p.salePrice && <p className="text-[11px] text-slate-500 line-through">{formatNPR(p.price)}</p>}</td>
                    <td className="px-4 py-3"><p className={`font-bold ${p.stock - p.reservedStock <= p.lowStockThreshold ? "text-amber-400" : "text-white"}`}>{p.stock - p.reservedStock}</p><p className="text-[11px] text-slate-500">{p.soldCount} sold</p></td>
                    <td className="px-4 py-3"><span className="text-[10px] font-black px-2 py-1 rounded-full capitalize" style={{ backgroundColor: `${STATUS_COLOR[p.status]}22`, color: STATUS_COLOR[p.status] }}>{p.status === "approved" ? "Live" : p.status === "pending" ? "Review pending" : p.status}</span></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {p.status !== "archived" && <>
                        {p.status === "approved" && <Link href={`/products/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white mr-3"><ExternalLink className="h-3.5 w-3.5" /> View</Link>}
                        <button onClick={() => { setEditing(p); setShowForm(true); }} className="text-xs font-bold text-amber-400 hover:underline mr-3">Edit</button>
                        <button onClick={() => archive(p.id)} className="text-xs font-bold text-rose-400 hover:underline">Archive</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/** Reusable catalog editor; only the endpoint and seller selector differ. */
export function ProductForm({ mode, categories, brands, sellers = [], editing, onClose, onSaved }: {
  mode: "vendor" | "admin";
  categories: Facet[];
  brands: Facet[];
  sellers?: SellerOption[];
  editing: VProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? "", vendorId: editing?.vendorId ?? "",
    categoryId: editing?.categoryId ?? "", brandId: editing?.brandId ?? "",
    shortDescription: editing?.shortDescription ?? "", description: editing?.description ?? "",
    price: editing ? String(editing.price) : "", salePrice: editing?.salePrice != null ? String(editing.salePrice) : "",
    stock: editing ? String(editing.stock) : "10", lowStockThreshold: String(editing?.lowStockThreshold ?? 5),
    warranty: editing?.warranty ?? "", returnPolicy: editing?.returnPolicy ?? "7 days return",
    tags: (editing?.tags ?? []).join(", "),
  });
  const [photoUrls, setPhotoUrls] = useState<string[]>((editing?.images ?? []).map((x) => x.url));
  const [variants, setVariants] = useState<VRow[]>(editing?.variants?.map((v) => ({ id: v.id, color: v.color || "", size: v.size || "", sku: v.sku, price: v.price == null ? "" : String(v.price), stock: String(v.stock), imageColor: v.imageColor || "#94a3b8" })) ?? []);
  const [useVariants, setUseVariants] = useState(!!editing?.variants?.length);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !uploading && !saving) onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [uploading, saving, onClose]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });
  const addVariant = () => setVariants([...variants, { color: "", size: "", sku: "", price: "", stock: "10", imageColor: "#0ea5e9" }]);
  const updateVariant = (i: number, key: keyof VRow, value: string) => setVariants(variants.map((v, j) => j === i ? { ...v, [key]: value } : v));

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    if (photoUrls.length + files.length > 8) { setError("Maximum 8 photos per product"); return; }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) throw new Error("Use JPG, PNG or WebP under 5 MB per photo");
        const data = new FormData();
        data.append("purpose", "product");
        data.append("image", file);
        const res = await fetch("/api/media", { method: "POST", body: data, credentials: "same-origin" });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Upload failed");
        uploaded.push(json.data.url);
      }
      setPhotoUrls((prev) => [...prev, ...uploaded]);
    } catch (e) { setError(errMsg(e)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const movePhoto = (index: number, delta: number) => {
    const next = [...photoUrls]; const other = index + delta;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    setPhotoUrls(next);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (photoUrls.length === 0) { setError("Upload at least one product photo before saving"); return; }
    if (mode === "admin" && !form.vendorId) { setError("Choose an approved seller"); return; }
    if (!form.name.trim() || form.name.trim().length < 3) { setError("Product name must be at least 3 characters"); return; }
    const price = Number(form.price);
    const sale = form.salePrice ? Number(form.salePrice) : null;
    if (!Number.isInteger(price) || price <= 0) { setError("Enter a valid price in Rs."); return; }
    if (sale !== null && sale >= price) { setError("Sale price must be lower than price"); return; }
    if (useVariants && !variants.length) { setError("Add a variant, or turn variants off"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(), categoryId: form.categoryId || null, brandId: form.brandId || null,
        shortDescription: form.shortDescription || null, description: form.description || null,
        price, salePrice: sale, stock: useVariants ? undefined : Number(form.stock) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 0,
        warranty: form.warranty || null, returnPolicy: form.returnPolicy || null,
        tags: form.tags.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12),
        images: photoUrls,
        ...(mode === "admin" ? { vendorId: form.vendorId } : {}),
      };
      if (useVariants || (editing && editing.variants.length > 0)) {
        body.variants = useVariants ? variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}), color: v.color || null, size: v.size || null,
          sku: v.sku || undefined, price: v.price ? Number(v.price) : null,
          stock: Number(v.stock) || 0, imageColor: v.imageColor,
        })) : [];
      }
      const endpoint = mode === "admin" ? "/api/admin/products" : "/api/vendor/products";
      await api(endpoint, { method: editing ? "PATCH" : "POST", body: editing ? { id: editing.id, ...body } : body });
      onSaved();
    } catch (err) { setError(errMsg(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-sm overflow-y-auto p-4 sm:p-8" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={editing ? "Edit product" : "Add product"} className="mx-auto max-w-3xl rounded-[24px] bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white">{editing ? "Edit product" : mode === "admin" ? "Add a product" : "Add a new product"}</h3>
            <p className="text-xs text-slate-500">{mode === "vendor" ? "A product admin verifies listings before they go live." : "Admin-created products publish immediately."}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close editor" className="h-9 w-9 rounded-xl hover:bg-slate-800 flex items-center justify-center"><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <form onSubmit={save} className="p-6 space-y-5">
          {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}
          {mode === "admin" && <div>
            <label htmlFor="product-seller" className="lbl">Seller / store *</label>
            <select id="product-seller" required value={form.vendorId} onChange={set("vendorId")} className={inputCls}>
              <option value="">Choose an approved seller</option>
              {sellers.map((v) => <option key={v.userId} value={v.userId}>{v.shopName}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">Products are attributed to a verified seller. Customers cannot list products.</p>
          </div>}
          <div><label htmlFor="product-name" className="lbl">Product name *</label><input id="product-name" required minLength={3} value={form.name} onChange={set("name")} placeholder="e.g. Mountain trail backpack" className={inputCls} /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label htmlFor="product-category" className="lbl">Category</label><select id="product-category" value={form.categoryId} onChange={set("categoryId")} className={inputCls}><option value="">Select a category</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
            <div><label htmlFor="product-brand" className="lbl">Brand</label><select id="product-brand" value={form.brandId} onChange={set("brandId")} className={inputCls}><option value="">Select a brand</option>{brands.map((br) => <option key={br.id} value={br.id}>{br.name}</option>)}</select></div>
          </div>
          <div><label htmlFor="product-summary" className="lbl">Short description</label><input id="product-summary" value={form.shortDescription} onChange={set("shortDescription")} maxLength={300} placeholder="One line that makes the product shine" className={inputCls} /></div>
          <div><label htmlFor="product-description" className="lbl">Product details</label><textarea id="product-description" value={form.description} onChange={set("description")} rows={3} className={`${inputCls} !h-auto py-3`} /></div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
            <div className="flex items-start gap-3 justify-between mb-3">
              <div><h4 className="text-sm font-bold text-white">Product photos <span className="text-rose-400">*</span></h4><p className="text-xs text-slate-500">First photo is the cover. JPG, PNG or WebP · up to 5 MB · 8 photos max.</p></div>
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{photoUrls.length}/8</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
              {photoUrls.map((url, i) => <div key={`${url}-${i}`} className="relative group/photo rounded-xl overflow-hidden aspect-square bg-slate-900 border border-slate-700">
                <img src={url} alt={`Product view ${i + 1}`} className="w-full h-full object-cover" />
                {i === 0 && <span className="absolute top-1 left-1 rounded-md bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5">COVER</span>}
                <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 bg-slate-950/80 py-1.5 opacity-100 sm:opacity-0 sm:group-hover/photo:opacity-100 transition-opacity">
                  <button type="button" onClick={() => movePhoto(i, -1)} disabled={i === 0} aria-label="Move photo left" className="p-1 text-white disabled:opacity-30 hover:text-amber-400"><ArrowLeft className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => movePhoto(i, 1)} disabled={i === photoUrls.length - 1} aria-label="Move photo right" className="p-1 text-white disabled:opacity-30 hover:text-amber-400"><ArrowRight className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setPhotoUrls(photoUrls.filter((_, j) => j !== i))} aria-label="Remove photo" className="p-1 text-rose-400 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>)}
              {photoUrls.length < 8 && <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-600 hover:border-amber-400 bg-slate-900/60 text-slate-400 hover:text-amber-400 flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-50">
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                <span className="text-[10px] font-bold">{uploading ? "Uploading" : "Add photos"}</span>
              </button>}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label="Upload product photos" onChange={(e) => uploadPhotos(e.target.files)} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="lbl">Price (Rs.) *</label><input type="number" min="1" required value={form.price} onChange={set("price")} className={inputCls} /></div>
            <div><label className="lbl">Sale price</label><input type="number" min="0" value={form.salePrice} onChange={set("salePrice")} placeholder="Optional" className={inputCls} /></div>
            {!useVariants && <div><label className="lbl">Stock</label><input type="number" min="0" value={form.stock} onChange={set("stock")} className={inputCls} /></div>}
            <div><label className="lbl">Low-stock alert</label><input type="number" min="0" value={form.lowStockThreshold} onChange={set("lowStockThreshold")} className={inputCls} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="lbl">Warranty</label><input value={form.warranty} onChange={set("warranty")} placeholder="e.g. 1 year" className={inputCls} /></div>
            <div><label className="lbl">Return policy</label><input value={form.returnPolicy} onChange={set("returnPolicy")} className={inputCls} /></div>
          </div>
          <div><label className="lbl">Tags (comma separated)</label><input value={form.tags} onChange={set("tags")} placeholder="trekking, outdoors, bags" className={inputCls} /></div>
          <div className="rounded-xl border border-slate-700 p-4">
            <label className="flex items-center gap-2.5 cursor-pointer text-sm font-bold text-white"><input type="checkbox" checked={useVariants} onChange={(e) => { setUseVariants(e.target.checked); if (e.target.checked && !variants.length) addVariant(); }} className="h-4 w-4 accent-amber-500" />This product has options (colour / size)</label>
            {useVariants && <div className="mt-4 space-y-2">
              {variants.map((v, i) => <div key={v.id || `new-${i}`} className="grid grid-cols-2 sm:grid-cols-7 gap-2 items-center">
                <input aria-label="Colour" placeholder="Colour" value={v.color} onChange={(e) => updateVariant(i, "color", e.target.value)} className={`${inputCls} !h-9`} />
                <input aria-label="Size" placeholder="Size" value={v.size} onChange={(e) => updateVariant(i, "size", e.target.value)} className={`${inputCls} !h-9`} />
                <input aria-label="Variant price" type="number" min="0" placeholder="Price" value={v.price} onChange={(e) => updateVariant(i, "price", e.target.value)} className={`${inputCls} !h-9`} />
                <input aria-label="Variant stock" type="number" min="0" placeholder="Stock" value={v.stock} onChange={(e) => updateVariant(i, "stock", e.target.value)} className={`${inputCls} !h-9`} />
                <input aria-label="Colour swatch" type="color" value={v.imageColor} onChange={(e) => updateVariant(i, "imageColor", e.target.value)} className="h-9 w-full rounded-lg bg-slate-900 border border-slate-700 cursor-pointer" />
                <input aria-label="Variant SKU" placeholder="SKU (optional)" value={v.sku} onChange={(e) => updateVariant(i, "sku", e.target.value)} className={`${inputCls} !h-9`} />
                <button type="button" onClick={() => setVariants(variants.filter((_, j) => j !== i))} aria-label="Remove variant" className="h-9 rounded-lg border border-slate-700 text-rose-400 flex items-center justify-center hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
              </div>)}
              <button type="button" onClick={addVariant} className="text-xs font-bold text-amber-400 hover:underline">+ Add another option</button>
            </div>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2 border-t border-slate-700">
            <p className="text-xs text-slate-500 flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-amber-400" /> {mode === "vendor" ? "Admin review required before customers can see it" : "Product will appear in the store when saved"}</p>
            <div className="flex gap-2 w-full sm:w-auto"><button type="button" onClick={onClose} className="h-11 px-5 rounded-xl border border-slate-700 text-sm font-bold text-slate-300">Cancel</button>
              <button disabled={uploading || saving || photoUrls.length === 0} className={`${btnPrimary} flex-1 sm:flex-none flex items-center justify-center gap-2`}>{saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : <><UploadCloud className="h-4 w-4" /> {editing ? "Save changes" : mode === "admin" ? "Publish product" : "Submit for approval"}</>}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
