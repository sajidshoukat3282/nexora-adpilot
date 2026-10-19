import React, { useState, useEffect } from "react";
import { FiSearch } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { LeadsBoard } from "./LeadsBoard";
import { ClientDetailDrawer } from "./ClientDetailDrawer";
import { useSession } from "@/hooks/useSession";
import type { Client } from "@/domain";
import AddClientForm from "./AddClientForm";
import AddLeadForm from "./AddLeadForm";

export const CrmPage: React.FC = () => {
  const { company } = useSession();
  const [tab, setTab] = useState<"leads" | "clients">("leads");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [clientsData, setClientsData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [showClientForm, setShowClientForm] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsRes, leadsRes] = await Promise.all([
        fetch('/api/crm/clients'),
        fetch('/api/crm/leads')
      ]);

      const cData = await clientsRes.json();
      const lData = await leadsRes.json();

      if (cData.ok) {
        const mappedClients: any = cData.data.map((c: any) => ({
          ...c,
          logoInitial: c.name ? c.name.charAt(0).toUpperCase() : 'C',
          isPortalEnabled: c.portal_status === 'active',
          isPortalInvited: c.portal_status === 'invited', // Naya status
          industry: c.industry || 'N/A'
        }));
        setClientsData(mappedClients);
      }

      if (lData.ok) {
        const mappedLeads = lData.data.map((l: any) => ({
          ...l,
          companyName: l.company_name,
          contactName: l.contact_name,
          estimatedValue: l.estimated_value,
          convertedClientId: l.converted_client_id
        }));
        setLeadsData(mappedLeads);
      }
    } catch (error) {
      console.error("Error fetching CRM data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInvite = async (clientId: string) => {
    try {
      const res = await fetch(`/api/crm/clients/${clientId}/invite`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.ok) {
        alert("Client invited successfully! (Portal email will be sent soon)");
        fetchData(); // List refresh karein
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("Network error while inviting client.");
    }
  };

  const filteredClients = clientsData.filter((c) => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <PageHeader
          title="CRM & Leads"
          description={`Sales pipeline and client roster for ${company?.name ?? "your company"}.`}
        />
        <div className="flex gap-3">
          <button 
            onClick={() => setShowLeadForm(true)} 
            className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            + Add Lead
          </button>
          <button 
            onClick={() => setShowClientForm(true)} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            + Add Client
          </button>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: "leads", label: "Pipeline", badge: leadsData.filter((l) => !["won", "lost"].includes(l.stage)).length },
          { key: "clients", label: "Clients", badge: clientsData.length },
        ]}
        active={tab}
        onChange={(k) => setTab(k as "leads" | "clients")}
      />

      <div className="mt-5">
        {tab === "leads" && (
          <LeadsBoard 
            leads={leadsData} 
            loading={loading} 
            onChanged={fetchData} 
          />
        )}

        {tab === "clients" && (
          <div>
            <div className="relative max-w-xs mb-4">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" size={14} />
              <input
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="input pl-9 w-full bg-transparent border border-gray-600 rounded p-2 text-white"
              />
            </div>
            <div className="panel">
              <DataTable<Client>
                columns={clientColumns(handleInvite)}
                rows={filteredClients}
                keyOf={(c) => c.id}
                onRowClick={(c) => setSelectedClient(c)}
                emptyTitle={loading ? "Loading clients..." : "No clients found"}
              />
            </div>
          </div>
        )}
      </div>

      <ClientDetailDrawer client={selectedClient} onClose={() => setSelectedClient(null)} />

      {showClientForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <AddClientForm 
            onClose={() => { 
              setShowClientForm(false); 
              fetchData(); 
            }} 
          />
        </div>
      )}

      {showLeadForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <AddLeadForm 
            onClose={() => { 
              setShowLeadForm(false); 
              fetchData(); 
            }} 
          />
        </div>
      )}
    </div>
  );
};

const clientColumns = (handleInvite: (id: string) => void): ColumnDef<Client>[] => [
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
    key: "credit_limit",
    header: "Credit Limit",
    render: (c: any) => (
      <span className="text-emerald-400 text-sm font-medium">
        {c.credit_limit ? c.credit_limit.toLocaleString() : '0'} <span className="text-xs text-ink-400">{c.currency || 'PKR'}</span>
      </span>
    ),
  },
  {
    key: "portal",
    header: "Client Portal",
    render: (c: any) => {
      if (c.isPortalEnabled) {
        return <span className="text-emerald-500 text-xs font-semibold">Enabled</span>;
      }
      if (c.isPortalInvited) {
        return <span className="text-amber-500 text-xs font-semibold">Invited</span>;
      }
      return <span className="text-gray-500 text-xs">Not enabled</span>;
    },
  },
  {
    key: "actions",
    header: "Action",
    render: (c: any) => {
      // Agar portal active ya invited hai to button disable ho jaye
      const isDisabled = c.isPortalEnabled || c.isPortalInvited;
      
      return (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Taake row click (Drawer) na khule
            handleInvite(c.id);
          }}
          disabled={isDisabled}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isDisabled 
              ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {c.isPortalEnabled ? 'Active' : c.isPortalInvited ? 'Invited' : 'Invite to Portal'}
        </button>
      );
    },
  },
];
