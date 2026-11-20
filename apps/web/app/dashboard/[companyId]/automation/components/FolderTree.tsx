"use client";

import { useState, useRef, useEffect } from "react";
import { Folder, Plus, MoreVertical, Trash2, AlertTriangle, Loader2 } from "lucide-react";

interface FolderType {
  id: string;
  name: string;
  description?: string;
  color?: string;
  children?: FolderType[];
  _count?: {
    automations: number;
  };
}

interface FolderTreeProps {
  folders: FolderType[];
  selectedFolderId?: string;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: () => void;
  onDeleteFolder?: (folderId: string) => Promise<void> | void;
}

export default function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close 3-dot menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuFolderId(null);
      }
    };
    if (activeMenuFolderId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenuFolderId]);

  const handleDeleteConfirm = async () => {
    if (!folderToDelete || !onDeleteFolder) return;
    try {
      setIsDeleting(true);
      await onDeleteFolder(folderToDelete.id);
      setFolderToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="w-72 h-full border-r border-slate-200 overflow-y-auto hidden md:block">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Folders
            </h3>
            <button
              type="button"
              onClick={onCreateFolder}
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="New Folder"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Folder List */}
          <div className="space-y-1">
            {folders.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm italic">
                No folders yet
              </div>
            )}

            {folders.map((folder) => {
              const isSelected = selectedFolderId === folder.id;
              const isMenuOpen = activeMenuFolderId === folder.id;

              return (
                <div key={folder.id} className="relative group">
                  <div
                    onClick={() => onSelectFolder(folder.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-3 cursor-pointer select-none ${isSelected
                      ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                      : "hover:bg-white/60 text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    <Folder
                      className={`w-4 h-4 shrink-0 transition-colors ${isSelected
                        ? "text-blue-500 fill-blue-500/20"
                        : "text-slate-400 group-hover:text-slate-500"
                        }`}
                    />
                    <div className="flex-1 min-w-0 pr-1">
                      <span className="font-medium text-sm truncate block">
                        {folder.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {folder._count && folder._count.automations > 0 && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${isSelected
                            ? "bg-blue-50 text-blue-600"
                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                            }`}
                        >
                          {folder._count.automations}
                        </span>
                      )}

                      {/* 3-dot menu button */}
                      {onDeleteFolder && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuFolderId(isMenuOpen ? null : folder.id);
                          }}
                          className={`p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ${isMenuOpen ? "opacity-100 bg-slate-100 text-slate-700" : "opacity-0 group-hover:opacity-100"
                            }`}
                          title="Folder options"
                          aria-label="Folder options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3-Dot Dropdown */}
                  {isMenuOpen && (
                    <div
                      ref={menuRef}
                      className="absolute right-2 top-full mt-1 z-30 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuFolderId(null);
                          setFolderToDelete(folder);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span>Delete folder</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete Folder Confirmation Modal */}
      {folderToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => {
            if (!isDeleting) setFolderToDelete(null);
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Delete &ldquo;{folderToDelete.name}&rdquo;?
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  When you delete this folder, <strong className="text-red-600">everything inside it will be permanently deleted</strong>, including all{" "}
                  {folderToDelete._count?.automations || 0} automations, flow charts, nodes, and execution histories.
                </p>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-200 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Everything</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
