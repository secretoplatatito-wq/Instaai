'use client';

import React, { useRef } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  X,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ProjectData } from '../types';
import { ProjectStore } from '../editor/ProjectStore';
import { BIOME_REGISTRY } from '../biomes/BiomeRegistry';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string;
  onLoadProject: (project: ProjectData) => void;
  onCreateNew: () => void;
  savedProjects: ProjectData[];
  onRefreshProjects: () => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  onLoadProject,
  onCreateNew,
  savedProjects,
  onRefreshProjects,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJson = (project: ProjectData) => {
    const json = ProjectStore.exportProjectJson(project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonStr = event.target?.result as string;
          const imported = ProjectStore.importProjectJson(jsonStr);
          onRefreshProjects();
          onLoadProject(imported);
          onClose();
        } catch {
          alert('Invalid project JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDuplicate = (project: ProjectData) => {
    const duplicated: ProjectData = {
      ...project,
      id: `project-${Date.now()}`,
      name: `${project.name} (Copy)`,
      updatedAt: Date.now(),
    };
    ProjectStore.saveProject(duplicated);
    onRefreshProjects();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this project?')) {
      ProjectStore.deleteProject(id);
      onRefreshProjects();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-xl bg-[#10141d] border border-white/10 rounded-2xl shadow-2xl p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Project Library</h2>
              <p className="text-xs text-gray-400">Manage, backup, and restore your 3D visualizer reels</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content List */}
        <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
          {savedProjects.map((p) => {
            const isCurrent = p.id === currentProjectId;
            const biomeMeta = BIOME_REGISTRY[p.biomeType];

            return (
              <div
                key={p.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                  isCurrent
                    ? 'border-cyan-400 bg-cyan-950/25 ring-1 ring-cyan-400/40'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    onLoadProject(p);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{p.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                    <span>{biomeMeta?.title || p.biomeType}</span>
                    <span>•</span>
                    <span>{p.trackInfo?.name || 'No soundtrack'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExportJson(p)}
                    title="Export JSON"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(p)}
                    title="Duplicate"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {savedProjects.length > 1 && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportJson}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium border border-white/10 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import JSON</span>
            </button>
          </div>

          <button
            onClick={() => {
              onCreateNew();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>
    </div>
  );
};
