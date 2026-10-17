import React, { useState, useMemo, useEffect } from "react";
import { FiSearch, FiMap, FiList, FiPlus } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge, assetOperationalTone } from "@/components/ui/StatusBadge";
import { CityMap } from "./CityMap";
import { AssetDetailDrawer } from "./AssetDetailDrawer";
import { useSearchParams } from "@/lib/router";
import type { MediaAsset, MediaType, AssetOperationalStatus } from "@/domain";
import { MEDIA_TYPE_LABELS, mediaCategory, formatMoney, money } from "@/domain";
import AddInventoryForm from "./AddInventoryForm";

const DEFAULT_CITIES = ["Lahore", "Karachi", "Islamabad"];
const ALL_MEDIA_TYPES = Object.keys(MEDIA_TYPE_LABELS) as MediaType[];

export const InventoryPage: React.FC = () => {
  const [view, setView] = useState<"map" | "list">("map");
  const [activeCity, setActiveCity] = useState(DEFAULT_CITIES[0]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | "static" | "digital">("all");
  const [mediaType, setMediaType] = useState<MediaType | "">("");
  const [status, setStatus] = useState<AssetOperationalStatus | "">("");
  const [selected, setSelected] = useState<MediaAsset | null>(null);

  // Real Data States
  const [assetsData, setAssetsData] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch real data from Database
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory');
      const result = await res.json();
      
      if (result.ok) {
        // Database data ko purane UI format mein map kar rahe hain
        const mappedData = result.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          code: `INV-${item.id.substring(0, 4).toUpperCase()}`,
          mediaType: item.screen_type === 'digital' ? 'digital_billboard' : 'static_billboard', // Adjust based on your exact MediaType
          location: {
            city: item.city || 'Unknown',
            address: item.location || '',
            lat: item.latitude || 0,
            lng: item.longitude || 0,
          },
          pricing: {
            baseDailyRateCents: item.rate || 0,
            currency: item.currency || 'PKR',
          },
          operationalStatus: item.status,
        }));
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

  // Local filtering logic (Kyunke backend mein filter nahi lagaya abhi)
  const filteredAssets = useMemo(() => {
    return assetsData.filter((a: any) => {
      const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === "all" || mediaCategory(a.mediaType) === category;
      const matchMediaType = mediaType ? a.mediaType === mediaType : true;
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

  // Completes the Notifications -> Inventory deep link.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkParams, filteredAssets]);

  return (
    <div>
      <div className="flex justify-between items-start mb-2">
        <PageHeader
          title="Inventory & Media Map"
          description="Browse static and digital OOH inventory with real interval-based availability."
        />
        <button 
          onClick={() => setShowAddForm(true)} 
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 mt-4"
        >
          <FiPlus /> Add Screen
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" size={14} />
          <input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search name, code, address..."
            className="input pl-9"
          />
        </div>
        <select className="input w-auto" value={category} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value as any)}>
          <option value="all">All Categories</option>
          <option value="static">Static</option>
          <option value="digital">Digital</option>
        </select>
        <select className="input w-auto" value={mediaType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMediaType(e.target.value as MediaType | "")}>
          <option value="">All Media Types</option>
          {ALL_MEDIA_TYPES.map((t) => (
            <option key={t} value={t}>{MEDIA_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select className="input w-auto" value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as AssetOperationalStatus | "")}>
          <option value="">All Statuses</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="maintenance">Maintenance</option>
        </select>

        <div className="flex-1" />

        <div className="flex items-center gap-1 bg-ink-800 rounded-lg p-1">
          <button
            onClick={() => setView("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${view === "map" ? "bg-ink-700 text-ink-50" : "text-ink-400"}`}
          >
            <FiMap size={13} /> Map
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${view === "list" ? "bg-ink-700 text-ink-50" : "text-ink-400"}`}
          >
            <FiList size={13} /> List
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 mt-10">Loading inventory data...</div>
      ) : (
        <>
          {view === "map" ? (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                {citiesList.map((c) => (
                  <button
                    key={c}
                    onClick={() => setActiveCity(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeCity === c ? "bg-signal-cyan text-ink-950" : "bg-ink-800 text-ink-300 hover:bg-ink-700"
                    }`}
                  >
                    {c} <span className="opacity-70">({cityCounts[c] ?? 0})</span>
                  </button>
                ))}
              </div>
              <CityMap assets={filteredAssets} city={activeCity} selectedId={selected?.id ?? null} onSelect={setSelected} />
            </div>
          ) : (
            <div className="panel">
              <DataTable<MediaAsset>
                columns={assetColumns}
                rows={filteredAssets}
                keyOf={(a) => a.id}
                onRowClick={(a) => setSelected(a)}
                emptyTitle="No assets match these filters"
              />
            </div>
          )}
        </>
      )}

      <AssetDetailDrawer asset={selected} onClose={() => setSelected(null)} />

      {/* Add Screen Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <AddInventoryForm 
            onClose={() => { 
              setShowAddForm(false); 
              fetchInventory(); // Form save hone par data refresh karein
            }} 
          />
        </div>
      )}
    </div>
  );
};

const assetColumns: ColumnDef<MediaAsset>[] = [
  {
    key: "name", header: "Asset", sortValue: (a) => a.name,
    render: (a) => (
      <div>
        <div className="font-medium text-ink-100">{a.name}</div>
        <div className="text-xs text-ink-500">{(a as any).code}</div>
      </div>
    ),
  },
  { key: "type", header: "Type", sortValue: (a) => a.mediaType, render: (a) => <span className="text-ink-300 text-sm">{MEDIA_TYPE_LABELS[a.mediaType] || a.mediaType}</span> },
  { key: "city", header: "City", sortValue: (a) => a.location.city, render: (a) => <span className="text-ink-300 text-sm">{a.location.city}</span> },
  {
    key: "category", header: "Category",
    render: (a) => <span className="text-xs text-ink-400">{mediaCategory(a.mediaType) === "digital" ? "Digital" : "Static"}</span>,
  },
  {
    key: "price", header: "Rate/day", sortValue: (a) => a.pricing.baseDailyRateCents,
    render: (a) => (
      <span className="text-ink-100 font-semibold text-sm">
        {formatMoney(money(a.pricing.baseDailyRateCents, (a.pricing as any).currency))}
      </span>
    ),
  },
  {
    key: "status", header: "Status", sortValue: (a) => a.operationalStatus,
    render: (a) => <StatusBadge label={a.operationalStatus} tone={assetOperationalTone(a.operationalStatus)} />,
  },
];
