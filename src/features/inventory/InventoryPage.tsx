import React, { useState, useMemo, useEffect } from "react";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { downloadCsv, toCsv } from "../crm/crmTools";
import { FIN, GOLD_CARD, SILVER_CARD, fit } from "../finance/financeUi";
import { CityMap } from "./CityMap";
import { AssetDetailDrawer } from "./AssetDetailDrawer";
import { useSearchParams } from "@/lib/router";
import type { MediaAsset, AssetOperationalStatus } from "@/domain";
import AddInventoryForm from "./AddInventoryForm";
import { SuggestScreensDrawer } from "./SuggestScreensDrawer";
import { DIGITAL_KINDS, STATIC_KINDS, daysUntil, mapInventory, rateSuffix } from "./inventoryTools";

const DEFAULT_CITIES = ["Lahore", "Karachi", "Islamabad"];
const ALL_KINDS = [...DIGITAL_KINDS, ...STATIC_KINDS];

export const InventoryPage: React.FC = () => {
  const [view, setView] = useState<"map" | "list">("map");
  const [activeCity, setActiveCity] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | "static" | "digital">("all");
  const [mediaType, setMediaType] = useState<string>("");
  const [status, setStatus] = useState<AssetOperationalStatus | "">("");
  const [selected, setSelected] = useState<MediaAsset | null>(null);

  const [assetsData, setAssetsData] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory');
      const result = await res.json();
      
      if (result.ok) {
        const mappedData = result.data.map((item: any) => mapInventory(item));
        setAssetsData(mappedData as any);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredAssets = useMemo(() => {
    return assetsData.filter((a: any) => {
      const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === "all" || a.screenType === category;
      const matchMediaType = mediaType ? a.kind === mediaType : true;
      const matchStatus = status ? a.operationalStatus === status : true;
      return matchSearch && matchCategory && matchMediaType && matchStatus;
    });
  }, [assetsData, search, category, mediaType, status]);

  const citiesList = useMemo(() => {
    const assetCities = filteredAssets.map((a: any) => a.location.city);
    return Array.from(new Set([...DEFAULT_CITIES, ...assetCities]));
  }, [filteredAssets]);

  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of citiesList) counts[c] = 0;
    filteredAssets.forEach((a: any) => {
      counts[a.location.city] = (counts[a.location.city] ?? 0) + 1;
    });
    return counts;
  }, [filteredAssets, citiesList]);

  useEffect(() => {
    if (!cityCounts[activeCity]) {
      const first = citiesList.find((c) => (cityCounts[c] ?? 0) > 0);
      if (first) setActiveCity(first);
      else if (!activeCity) setActiveCity(citiesList[0] ?? "");
    }
  }, [cityCounts, citiesList, activeCity]);

  const [linkParams, setLinkParams] = useSearchParams();
  useEffect(() => {
    const assetId = linkParams.get("asset");
    if (assetId && filteredAssets) {
      const match = filteredAssets.find((a: any) => a.id === assetId);
      if (match) {
        setSelected(match);
        setActiveCity(match.location.city);
      }
      setLinkParams({ asset: null });
    }
  }, [linkParams, filteredAssets]);

  const today = new Date().toISOString().slice(0, 10);
  const kpi = useMemo(() => {
    const all = assetsData as any[];
    return {
      total: all.length,
      digital: all.filter((a) => a.screenType === "digital").length,
      stat: all.filter((a) => a.screenType === "static").length,
      online: all.filter((a) => a.operationalStatus === "online").length,
      expiring: all.filter((a) => {
        const sp = a.specs || {};
        return [sp.permit_expiry, sp.contract_end].some((d: any) => d && daysUntil(String(d)) !== null && (daysUntil(String(d)) as number) <= 30);
      }).length,
    };
  }, [assetsData]);

  const exportCsv = () => {
    const rows = filteredAssets.map((a: any) => ({
      name: a.name,
      code: a.code,
      category: a.screenType === "digital" ? "Digital" : "Static",
      type: a.kindLabel,
      city: a.location.city,
      address: a.location.address ?? "",
      size: a.rawSize ?? "",
      rate: a.pricing.baseDailyRateCents,
      currency: a.pricing.currency,
      status: a.operationalStatus,
    }));
    downloadCsv(
      `inventory-${today}.csv`,
      toCsv(rows, [
        { key: "name", label: "Screen" },
        { key: "code", label: "Code" },
        { key: "category", label: "Category" },
        { key: "type", label: "Type" },
        { key: "city", label: "City" },
        { key: "address", label: "Address" },
        { key: "size", label: "Size" },
        { key: "rate", label: "Rate" },
        { key: "currency", label: "Currency" },
        { key: "status", label: "Status" },
      ]),
    );
  };

  const cards = [
    { label: "Total screens", value: String(kpi.total), gold: true, sub: `${kpi.digital} digital, ${kpi.stat} static` },
    { label: "Online", value: String(kpi.online), gold: false, sub: `${kpi.total - kpi.online} offline or in maintenance` },
    { label: "Digital", value: String(kpi.digital), gold: false, sub: "slot-based booking" },
    { label: "Expiring soon", value: String(kpi.expiring), gold: true, sub: "permit or contract within 30 days" },
  ];

  const tone = (st: string) =>
    st === "online"
      ? "text-emerald-300 bg-emerald-400/10 border-emerald-400/30"
      : st === "maintenance"
        ? "text-amber-300 bg-amber-400/10 border-amber-400/30"
        : "text-rose-300 bg-rose-400/10 border-rose-400/30";

  return (
    <div className={FIN.page}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-50">Inventory &amp; Media Map</h1>
          <p className="text-[11px] text-zinc-500">Your digital screens and static billboards, with slot-based availability by date.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={FIN.btnGhost} onClick={() => setShowSuggest(true)}>Suggest screens</button>
          <button className={FIN.btnGhost} onClick={exportCsv}>Export CSV</button>
          <PermissionGate permission="inventory.manage" fallback={null}>
            <button onClick={() => setShowAddForm(true)} className={FIN.btnGold}>+ Add Screen</button>
          </PermissionGate>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl p-3" style={c.gold ? GOLD_CARD : SILVER_CARD}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/60">{c.label}</p>
            <p className="mt-1 font-bold text-[#1a1204]" style={{ fontSize: fit(c.value, 22, 150) }}>{c.value}</p>
            <p className="text-[10px] text-black/55">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder="Search name, code, address..."
          className={`${FIN.input} max-w-xs`}
        />
        <select className={`${FIN.input} w-auto`} value={category} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value as any)}>
          <option value="all">All Categories</option>
          <option value="static">Static</option>
          <option value="digital">Digital</option>
        </select>
        <select className={`${FIN.input} w-auto`} value={mediaType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMediaType(e.target.value)}>
          <option value="">All Media Types</option>
          {ALL_KINDS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select className={`${FIN.input} w-auto`} value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as AssetOperationalStatus | "")}>
          <option value="">All Statuses</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <div className="ml-auto flex gap-1.5">
          <button className={view === "map" ? FIN.btnGold : FIN.btnGhost} onClick={() => setView("map")}>Map</button>
          <button className={view === "list" ? FIN.btnGold : FIN.btnGhost} onClick={() => setView("list")}>List</button>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-[12px] text-zinc-500">Loading inventory...</p>
      ) : view === "map" ? (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {citiesList.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCity(c)}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                  activeCity === c ? "border-[#c99b3b]/70 bg-[#c99b3b]/15 text-[#f1d68a]" : "border-[#2b3038] text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {c} <span className="opacity-60">{cityCounts[c] ?? 0}</span>
              </button>
            ))}
          </div>
          <CityMap assets={filteredAssets} city={activeCity} selectedId={selected?.id ?? null} onSelect={setSelected} />
        </div>
      ) : (
        <div className={`${FIN.panel} overflow-x-auto`}>
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-[#2a2f37] text-[10px] uppercase tracking-[0.12em] text-zinc-400">
              <tr>
                <th className="p-3 font-semibold">Asset</th>
                <th className="p-3 font-semibold">Type</th>
                <th className="p-3 font-semibold">City</th>
                <th className="p-3 font-semibold">Category</th>
                <th className="p-3 text-right font-semibold">Rate</th>
                <th className="p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-[12px] text-zinc-500">{assetsData.length === 0 ? "No screens yet. Add your first screen." : "No assets match these filters."}</td></tr>
              )}
              {filteredAssets.map((a: any) => (
                <tr key={a.id} onClick={() => setSelected(a)} className="cursor-pointer border-t border-[#20242b] text-[12px] transition hover:bg-white/[0.03]">
                  <td className="p-3">
                    <div className="font-medium text-zinc-100">{a.name}</div>
                    <div className="font-mono text-[10px] text-zinc-500">{a.code}</div>
                  </td>
                  <td className="p-3 text-zinc-300">{a.kindLabel || "-"}</td>
                  <td className="p-3 text-zinc-300">{a.location.city}</td>
                  <td className="p-3 text-zinc-400">{a.screenType === "digital" ? "Digital" : "Static"}</td>
                  <td className="p-3 text-right font-semibold text-zinc-100">
                    {a.pricing.currency} {Number(a.pricing.baseDailyRateCents).toLocaleString("en-US")}{rateSuffix(a.pricing.basis)}
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${tone(a.operationalStatus)}`}>{a.operationalStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AssetDetailDrawer
        asset={selected}
        onClose={() => setSelected(null)}
        onEdit={(a: any) => {
          setSelected(null);
          setEditing(a);
        }}
      />

      <SuggestScreensDrawer open={showSuggest} onClose={() => setShowSuggest(false)} cities={citiesList} />

      {(showAddForm || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <AddInventoryForm
            asset={editing ?? undefined}
            onClose={() => {
              setShowAddForm(false);
              setEditing(null);
              fetchInventory();
            }}
          />
        </div>
      )}
    </div>
  );
};
