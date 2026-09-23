import React, { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { LeadsBoard } from "./LeadsBoard";
import { ClientDetailDrawer } from "./ClientDetailDrawer";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { Client } from "@/domain";

export const CrmPage: React.FC = () => {
  const [tab, setTab] = useState<"leads" | "clients">("leads");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const leads = useAsync(() => repo.crm.listLeads(), []);
  const clients = useAsync(() => repo.crm.listClients(search || undefined), [search]);

  return (
    <div>
      <PageHeader
        title="CRM & Leads"
        description="Sales pipeline and client roster for Vantage Outdoor Media."
      />

      <Tabs
        tabs={[
          { key: "leads", label: "Pipeline", badge: leads.data?.filter((l) => !["won", "lost"].includes(l.stage)).length },
          { key: "clients", label: "Clients", badge: clients.data?.length },
        ]}
        active={tab}
        onChange={(k) => setTab(k as "leads" | "clients")}
      />

      <div className="mt-5">
        {tab === "leads" && (
          <LeadsBoard leads={leads.data ?? []} loading={leads.loading} onChanged={leads.reload} />
        )}

        {tab === "clients" && (
          <div>
            <div className="relative max-w-xs mb-4">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" size={14} />
              <input
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="input pl-9"
              />
            </div>
            <div className="panel">
              <DataTable<Client>
                columns={clientColumns}
                rows={clients.data ?? []}
                keyOf={(c) => c.id}
                onRowClick={(c) => setSelectedClient(c)}
                emptyTitle="No clients found"
              />
            </div>
          </div>
        )}
      </div>

      <ClientDetailDrawer client={selectedClient} onClose={() => setSelectedClient(null)} />
    </div>
  );
};

const clientColumns: ColumnDef<Client>[] = [
  {
    key: "name",
    header: "Client",
    sortValue: (c) => c.name,
    render: (c) => (
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-ink-700 flex items-center justify-center text-xs font-bold text-ink-100 shrink-0">
          {c.logoInitial}
        </div>
        <span className="font-medium text-ink-100">{c.name}</span>
      </div>
    ),
  },
  { key: "industry", header: "Industry", sortValue: (c) => c.industry, render: (c) => <span className="text-ink-300">{c.industry}</span> },
  {
    key: "portal",
    header: "Client Portal",
    render: (c) => (
      <span className={c.isPortalEnabled ? "text-signal-green text-xs font-semibold" : "text-ink-500 text-xs"}>
        {c.isPortalEnabled ? "Enabled" : "Not enabled"}
      </span>
    ),
  },
];
