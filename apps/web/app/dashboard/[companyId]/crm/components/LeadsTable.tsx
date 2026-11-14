"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Sparkles, AlertTriangle, Inbox } from "lucide-react";
import { toast } from "@/lib/toast";
import ExportLeadsModal from "./ExportLeadsModal";
import {
  Lead,
  LeadsResponse,
  LeadsTableProps,
  SortField,
  InteractionFilter,
  ViewMode,
  PipelineConfig,
  PipelineColumnState,
  LeadsStatsCards,
  LeadsToolbar,
  LeadsKanbanView,
  LeadsTableView,
  LeadProfileDrawer,
} from "./leads";

export type { Lead, LeadsTableProps };

export default function LeadsTable({ instagramAccountId, basePath }: LeadsTableProps) {
  const { data: session } = useSession();
  const currentUserName = session?.user?.name || "CRM Team";

  // Data state for Table View
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // CRM Lead Inspection Drawer States (Features 1, 4, 6)

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xml'>('csv');

  // Pipeline configuration (Custom statuses: 1+ + Follow-up Due, and custom tags)
  const [pipelineConfig, setPipelineConfig] = useState<{
    customStatuses: string[];
    customTags: string[];
  }>({
    customStatuses: ['New', 'Engaged', 'Qualified'],
    customTags: ['VIP', 'Hot Lead', 'High Budget', 'Warm'],
  });

  // Dedicated independent Pipeline Kanban state per column
  const [pipelineColumns, setPipelineColumns] = useState<
    Record<
      string,
      {
        leads: Lead[];
        page: number;
        total: number;
        hasMore: boolean;
        loading: boolean;
        loadingMore: boolean;
      }
    >
  >({});

  // Action states
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [openActionLeadId, setOpenActionLeadId] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Sort state
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [interactionFilter, setInteractionFilter] = useState<InteractionFilter>('all');

  // Stats state
  const [stats, setStats] = useState({ total: 0, followUpCount: 0 });

  // Load company pipeline config
  const loadPipelineConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/pipeline-config');
      if (res.ok) {
        const data = await res.json();
        const customStatusesList = data.customStatuses || data.config?.customStatuses;
        const customTagsList = data.customTags || data.config?.customTags;
        setPipelineConfig({
          customStatuses:
            Array.isArray(customStatusesList) && customStatusesList.length > 0
              ? customStatusesList
              : ['New', 'Engaged', 'Qualified'],
          customTags: Array.isArray(customTagsList)
            ? customTagsList
            : ['VIP', 'Hot Lead', 'High Budget', 'Warm'],
        });
      }
    } catch (err) {
      console.error('Failed to load pipeline config:', err);
    }
  }, []);

  useEffect(() => {
    loadPipelineConfig();
    const handleConfigUpdate = () => loadPipelineConfig();
    window.addEventListener('pipeline-config-updated', handleConfigUpdate);
    return () => window.removeEventListener('pipeline-config-updated', handleConfigUpdate);
  }, [loadPipelineConfig]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        accountId: instagramAccountId,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (interactionFilter !== 'all') params.set('interactionType', interactionFilter);

      const response = await fetch(`/api/leads?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        let msg = 'Failed to fetch leads';
        try {
          const errJson = JSON.parse(errText);
          msg = errJson.message || errJson.error || msg;
        } catch {
          if (errText && !errText.startsWith('<')) msg = errText;
        }
        throw new Error(msg);
      }
      const text = await response.text();
      if (text.startsWith('<')) {
        throw new Error('API server returned HTML. Please ensure @instance/api is running on port 4000.');
      }
      const data: LeadsResponse = JSON.parse(text);

      setLeads(data.leads || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
      setStats({
        total: data.stats?.total ?? 0,
        followUpCount: data.stats?.followUpCount ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [instagramAccountId, page, limit, sortBy, sortOrder, debouncedSearch, interactionFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Export handlers
  const handleOpenExportModal = (format: 'csv' | 'xml') => {
    setExportFormat(format);
    setIsExportModalOpen(true);
  };

  const executeExport = (format: 'csv' | 'xml', selectedFieldIds: string[]) => {
    const params = new URLSearchParams({
      accountId: instagramAccountId,
      export: format,
      sortBy,
      sortOrder,
      fields: selectedFieldIds.join(','),
    });

    if (debouncedSearch) params.set('search', debouncedSearch);
    if (interactionFilter !== 'all') params.set('interactionType', interactionFilter);

    toast.success(`Preparing ${format.toUpperCase()} export...`);
    window.location.href = `/api/leads?${params.toString()}`;
    setIsExportModalOpen(false);
  };

  // Clipboard copy with fallback for all browser contexts
  const copyTextToClipboard = (text: string, id: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };


  const handleOpenInstagram = (lead: Lead) => {
    const username = lead.username || lead.instagramUserId;
    const url = username
      ? `https://ig.me/m/${username.replace('@', '')}`
      : `https://www.instagram.com/direct/t/${lead.instagramUserId}`;
    window.open(url, '_blank');
  };

  const handleDmClick = (lead: Lead) => {
    handleOpenInstagram(lead);
  };


  // Independent Pipeline Board Per-Column Fetching & Scroll Pagination
  const fetchColumnLeads = useCallback(
    async (statusName: string, pageNum: number = 1, append: boolean = false) => {
      setPipelineColumns((prev) => {
        const existing = prev[statusName] || {
          leads: [],
          page: 1,
          total: 0,
          hasMore: false,
          loading: false,
          loadingMore: false,
        };
        return {
          ...prev,
          [statusName]: {
            ...existing,
            loading: !append,
            loadingMore: append,
          },
        };
      });

      try {
        const isFollowUp =
          statusName.toLowerCase() === 'follow-up due' ||
          statusName.toLowerCase() === 'follow up due';
        const isFirstCustom =
          !isFollowUp &&
          pipelineConfig.customStatuses.length > 0 &&
          statusName.toLowerCase() === pipelineConfig.customStatuses[0].toLowerCase();

        const params = new URLSearchParams({
          accountId: instagramAccountId,
          page: pageNum.toString(),
          limit: '10',
        }); {
          params.set('status', statusName);
          if (isFirstCustom) {
            params.set('isDefaultStatus', 'true');
          }
        }

        const response = await fetch(`/api/leads?${params.toString()}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch leads for ${statusName}`);
        }

        const text = await response.text();
        if (text.startsWith('<')) {
          throw new Error('API server returned HTML');
        }

        const data = JSON.parse(text);
        const incomingLeads: Lead[] = data.leads || [];
        const total = data.pagination?.total ?? incomingLeads.length;
        const hasMore =
          data.pagination?.hasMore ?? (pageNum * 10 < total || incomingLeads.length >= 10);

        setPipelineColumns((prev) => {
          const existing = prev[statusName] || {
            leads: [],
            page: 1,
            total: 0,
            hasMore: false,
            loading: false,
            loadingMore: false,
          };

          let mergedLeads: Lead[];
          if (append) {
            const existingIds = new Set(existing.leads.map((l) => l.id));
            const newUnique = incomingLeads.filter((l) => !existingIds.has(l.id));
            mergedLeads = [...existing.leads, ...newUnique];
          } else {
            mergedLeads = incomingLeads;
          }

          return {
            ...prev,
            [statusName]: {
              leads: mergedLeads,
              page: pageNum,
              total,
              hasMore,
              loading: false,
              loadingMore: false,
            },
          };
        });
      } catch (err) {
        console.error(`Error loading pipeline column "${statusName}":`, err);
        setPipelineColumns((prev) => {
          const existing = prev[statusName] || {
            leads: [],
            page: 1,
            total: 0,
            hasMore: false,
            loading: false,
            loadingMore: false,
          };
          return {
            ...prev,
            [statusName]: {
              ...existing,
              loading: false,
              loadingMore: false,
            },
          };
        });
      }
    },
    [instagramAccountId, pipelineConfig.customStatuses]
  );

  // Load initial top 10 for each pipeline column when in Kanban view or when custom statuses change
  useEffect(() => {
    if (viewMode === 'kanban' && pipelineConfig.customStatuses.length > 0) {
      const allStages = [...pipelineConfig.customStatuses, 'Follow-up Due'];
      allStages.forEach((stage) => {
        // Fetch if column leads haven't been loaded yet
        if (!pipelineColumns[stage] || pipelineColumns[stage].leads.length === 0) {
          fetchColumnLeads(stage, 1, false);
        }
      });
    }
  }, [viewMode, pipelineConfig.customStatuses, fetchColumnLeads]);

  // Per-column scroll handler for infinite scroll pagination
  const handleColumnScroll = (stageName: string, e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const colData = pipelineColumns[stageName];
    if (!colData || colData.loading || colData.loadingMore || !colData.hasMore) return;

    const threshold = 60; // 60px from bottom
    if (target.scrollHeight - target.scrollTop - target.clientHeight < threshold) {
      fetchColumnLeads(stageName, colData.page + 1, true);
    }
  };

  // Status updates (Drag & Drop, 3-dot menu, or Inspection Drawer)
  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    // 1. Update table leads
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    setOpenActionLeadId(null);

    // 2. Update pipelineColumns: move lead to target column
    setPipelineColumns((prev) => {
      const nextCols = { ...prev };
      let movedLead: Lead | null = null;

      // Find and remove from previous column
      Object.keys(nextCols).forEach((colName) => {
        const idx = nextCols[colName].leads.findIndex((l) => l.id === leadId);
        if (idx !== -1) {
          movedLead = { ...nextCols[colName].leads[idx], status: newStatus };
          nextCols[colName] = {
            ...nextCols[colName],
            leads: nextCols[colName].leads.filter((l) => l.id !== leadId),
            total: Math.max(0, nextCols[colName].total - 1),
          };
        }
      });

      // If not found in existing columns, check selectedLead or leads
      if (!movedLead) {
        const found = leads.find((l) => l.id === leadId) || selectedLead;
        if (found) {
          movedLead = { ...found, status: newStatus };
        }
      }

      // Add to target column
      if (movedLead && nextCols[newStatus]) {
        nextCols[newStatus] = {
          ...nextCols[newStatus],
          leads: [movedLead, ...nextCols[newStatus].leads.filter((l) => l.id !== leadId)],
          total: nextCols[newStatus].total + 1,
        };
      }

      return nextCols;
    });

    try {
      setIsUpdatingStatus(leadId);
      await fetch('/api/crm/update-lead-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: leadId, status: newStatus }),
      });
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (leadId: string, e: React.DragEvent) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnColumn = async (targetStatus: string, e: React.DragEvent) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!leadId) return;

    setDraggedLeadId(null);
    await handleUpdateStatus(leadId, targetStatus);
  };

  // Tag management: Strictly allow assigning ONLY company tags defined in Settings.
  // New tags cannot be created here.
  const handleAddTag = async (leadId: string, tagToAdd: string) => {
    if (!tagToAdd.trim()) return;
    const cleanTag = tagToAdd.trim();

    // Strict validation: Must exist in company customTags
    if (!pipelineConfig.customTags.includes(cleanTag)) {
      return;
    }

    const lead =
      leads.find((l) => l.id === leadId) ||
      selectedLead ||
      Object.values(pipelineColumns)
        .flatMap((col) => col.leads)
        .find((l) => l.id === leadId);

    if (!lead) return;
    const existingTags = Array.isArray(lead.tags) ? lead.tags : [];
    if (existingTags.includes(cleanTag)) return;

    const nextTags = [...existingTags, cleanTag];

    // Update table leads
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, tags: nextTags } : l))
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, tags: nextTags } : null));
    }

    // Update pipeline columns
    setPipelineColumns((prev) => {
      const nextCols = { ...prev };
      Object.keys(nextCols).forEach((colName) => {
        nextCols[colName] = {
          ...nextCols[colName],
          leads: nextCols[colName].leads.map((l) =>
            l.id === leadId ? { ...l, tags: nextTags } : l
          ),
        };
      });
      return nextCols;
    });

    try {
      await fetch('/api/crm/update-lead-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: leadId, tags: nextTags }),
      });
    } catch (err) {
      console.error('Error saving tags:', err);
    }
  };

  const handleRemoveTag = async (leadId: string, tagToRemove: string) => {
    const lead =
      leads.find((l) => l.id === leadId) ||
      selectedLead ||
      Object.values(pipelineColumns)
        .flatMap((col) => col.leads)
        .find((l) => l.id === leadId);

    if (!lead) return;
    const existingTags = Array.isArray(lead.tags) ? lead.tags : [];
    const nextTags = existingTags.filter((t) => t !== tagToRemove);

    // Update table leads
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, tags: nextTags } : l))
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, tags: nextTags } : null));
    }

    // Update pipeline columns
    setPipelineColumns((prev) => {
      const nextCols = { ...prev };
      Object.keys(nextCols).forEach((colName) => {
        nextCols[colName] = {
          ...nextCols[colName],
          leads: nextCols[colName].leads.map((l) =>
            l.id === leadId ? { ...l, tags: nextTags } : l
          ),
        };
      });
      return nextCols;
    });

    try {
      await fetch('/api/crm/update-lead-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: leadId, tags: nextTags }),
      });
    } catch (err) {
      console.error('Error removing tag:', err);
    }
  };

  // Dynamic Pipeline Board Columns: Computed completely independently from pipelineColumns!
  // Supports 1, 2, 3, 4+ custom statuses + locked Follow-up Due.
  const kanbanColumns = useMemo(() => {
    const palette = [
      { dotColor: 'bg-amber-400', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200/60' },
      { dotColor: 'bg-sky-500', badgeColor: 'bg-sky-50 text-sky-700 border-sky-200/60' },
      { dotColor: 'bg-indigo-500', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/60' },
      { dotColor: 'bg-emerald-500', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
      { dotColor: 'bg-purple-500', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200/60' },
      { dotColor: 'bg-pink-500', badgeColor: 'bg-pink-50 text-pink-700 border-pink-200/60' },
      { dotColor: 'bg-teal-500', badgeColor: 'bg-teal-50 text-teal-700 border-teal-200/60' },
      { dotColor: 'bg-cyan-500', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200/60' },
    ];

    const customCols = pipelineConfig.customStatuses.map((statusName, idx) => {
      const colors = palette[idx % palette.length];
      const colData = pipelineColumns[statusName] || {
        leads: [],
        page: 1,
        total: 0,
        hasMore: false,
        loading: false,
        loadingMore: false,
      };

      return {
        id: `custom-status-${idx}`,
        name: statusName,
        dotColor: colors.dotColor,
        badgeColor: colors.badgeColor,
        leads: colData.leads,
        total: colData.total,
        page: colData.page,
        hasMore: colData.hasMore,
        loading: colData.loading,
        loadingMore: colData.loadingMore,
        isLocked: false,
      };
    });

    // Final column: Locked Follow-up Due
    const followupData = pipelineColumns['Follow-up Due'] || {
      leads: [],
      page: 1,
      total: 0,
      hasMore: false,
      loading: false,
      loadingMore: false,
    };

    const followupCol = {
      id: 'followup-due',
      name: 'Follow-up Due',
      dotColor: 'bg-rose-500',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200/60',
      leads: followupData.leads,
      total: followupData.total,
      page: followupData.page,
      hasMore: followupData.hasMore,
      loading: followupData.loading,
      loadingMore: followupData.loadingMore,
      isLocked: true,
    };

    return [...customCols, followupCol];
  }, [pipelineConfig.customStatuses, pipelineColumns]);

  return (
    <div className="space-y-6">
      <LeadsStatsCards stats={stats} />

      <LeadsToolbar
        search={search}
        setSearch={setSearch}
        viewMode={viewMode}
        setViewMode={setViewMode}
        handleOpenExportModal={handleOpenExportModal} interactionFilter={interactionFilter}
        setInteractionFilter={setInteractionFilter}
        setPage={setPage}
        visibleCount={leads.length}
        totalCount={total}
      />

      {loading && leads.length === 0 ? (
        <div className="glass-panel p-20 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center animate-spin mb-4">
            <Sparkles size={22} />
          </div>
          <p className="text-base font-bold text-slate-900">Loading prospects...</p>
          <p className="text-xs text-slate-500 mt-1">Retrieving enriched prospect profiles</p>
        </div>
      ) : error ? (
        <div className="glass-panel p-16 text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200/60">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-slate-900">Unable to load lead data</p>
          <p className="text-xs text-slate-500 mt-1 mb-4 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchLeads}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-xs shadow-blue-500/20 cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      ) : leads.length === 0 ? (
        <div className="glass-panel p-20 text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-200/60">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1 font-display">No prospects match your filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting your status or source filters to view all collected prospects.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setInteractionFilter('all');
              setPage(1);
            }}
            className="mt-4 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'kanban' ? (
        <LeadsKanbanView
          kanbanColumns={kanbanColumns}
          draggedLeadId={draggedLeadId}
          setDraggedLeadId={setDraggedLeadId}
          handleDragStart={handleDragStart}
          handleDropOnColumn={handleDropOnColumn}
          handleColumnScroll={handleColumnScroll}
          openActionLeadId={openActionLeadId}
          setOpenActionLeadId={setOpenActionLeadId}
          setSelectedLead={setSelectedLead}
          handleOpenInstagram={handleOpenInstagram}
          handleDmClick={handleDmClick}
          handleUpdateStatus={handleUpdateStatus}
          isUpdatingStatus={isUpdatingStatus}
          pipelineConfig={pipelineConfig}
          copiedId={copiedId}
          copyTextToClipboard={copyTextToClipboard}
          fetchColumnLeads={fetchColumnLeads}
        />
      ) : (
        <LeadsTableView
          leads={leads}
          loading={loading}
          sortBy={sortBy}
          handleSort={handleSort}
          setSelectedLead={setSelectedLead}
          handleOpenInstagram={handleOpenInstagram}
          handleDmClick={handleDmClick}
          copiedId={copiedId}
          copyTextToClipboard={copyTextToClipboard}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          limit={limit}
          setLimit={setLimit}
          total={total}
        />
      )}

      <LeadProfileDrawer
        selectedLead={selectedLead}
        setSelectedLead={setSelectedLead}
        basePath={basePath}
        pipelineConfig={pipelineConfig}
        handleUpdateStatus={handleUpdateStatus}
        handleAddTag={handleAddTag}
        handleRemoveTag={handleRemoveTag}
        handleDmClick={handleDmClick}
        copiedId={copiedId}
        setCopiedId={setCopiedId}
        copyTextToClipboard={copyTextToClipboard}
      />

      {/* Export CSV / XML Custom Fields Modal */}
      <ExportLeadsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={executeExport}
        initialFormat={exportFormat}
      />
    </div>
  );
}
