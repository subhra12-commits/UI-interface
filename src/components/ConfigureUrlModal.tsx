import React, { useEffect, useState } from 'react';
import { ArrowRight, Link2, Trash2, X } from 'lucide-react';
import type { WorkspaceProject } from '../data/projects';
import { validateWorkspaceUrl } from '../utils/workspaceLaunch';

interface ConfigureUrlModalProps {
  project: WorkspaceProject | null;
  currentUrl: string | null;
  onClose: () => void;
  onSave: (project: WorkspaceProject, url: string, launchAfterSave: boolean) => void;
  onClear: (project: WorkspaceProject) => void;
}

export const ConfigureUrlModal: React.FC<ConfigureUrlModalProps> = ({
  project,
  currentUrl,
  onClose,
  onSave,
  onClear,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setUrlInput(currentUrl ?? '');
      setError(null);
    }
  }, [project, currentUrl]);

  if (!project) return null;

  const handleSubmit = (launchAfterSave: boolean) => {
    const result = validateWorkspaceUrl(urlInput);
    if (!result.valid || !result.normalizedUrl) {
      setError(result.error ?? 'Please provide a valid URL.');
      return;
    }
    onSave(project, result.normalizedUrl, launchAfterSave);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="configure-url-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#32060A]/70 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#EAD9BE] bg-[#FFFBF2] p-6 shadow-2xl sm:p-7">
        <div
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#5A0D14] via-[#E8B14B] to-[#5A0D14]"
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close URL configuration dialog"
          className="absolute top-4 right-4 rounded-full p-2 text-[#6B4C46] transition-colors hover:bg-[#EAD9BE]/50 hover:text-[#5A0D14] focus-visible:outline-2 focus-visible:outline-[#5A0D14]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5A0D14] text-[#F6C361]">
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="configure-url-title"
              className="font-display text-xl font-bold text-[#5A0D14]"
            >
              Configure Application URL
            </h2>
            <p className="text-xs font-medium text-[#6B4C46]">{project.name}</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[#4D302C]">
          No deployment URL has been assigned to <strong>{project.name}</strong> yet. Enter the
          deployed frontend URL below to connect the <strong>Open</strong> button.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(true);
          }}
          className="mt-5 space-y-4"
        >
          <div>
            <label
              htmlFor="workspace-custom-url-input"
              className="block text-xs font-semibold text-[#5A0D14]"
            >
              Deployed Application URL
            </label>
            <input
              id="workspace-custom-url-input"
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="https://your-service.onrender.com/"
              className="mt-1.5 w-full rounded-xl border border-[#DFC9A4] bg-white px-3.5 py-2.5 text-sm text-[#3B1715] placeholder:text-[#A38A7B] focus:border-[#5A0D14] focus:ring-2 focus:ring-[#E5A73B]/40 focus:outline-none"
            />
            {error && (
              <p className="mt-1.5 text-xs font-medium text-[#9B221E]" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              {currentUrl && (
                <button
                  type="button"
                  onClick={() => onClear(project)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-[#8C211D] transition-colors hover:bg-[#FDEBE8]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Clear URL</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#D8BE95] bg-white px-4 py-2 text-xs font-semibold text-[#5A0D14] transition-colors hover:bg-[#F6E8D0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                className="rounded-full border border-[#5A0D14] bg-white px-4 py-2 text-xs font-semibold text-[#5A0D14] transition-colors hover:bg-[#F9EFE0]"
              >
                Save URL
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#5A0D14] px-5 py-2 text-xs font-semibold text-[#FDF5E6] shadow-sm transition-colors hover:bg-[#73121B]"
              >
                <span>Save &amp; Open</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
