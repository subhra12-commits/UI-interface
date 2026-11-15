import React from 'react';
import { AlertTriangle, ExternalLink, RefreshCw, X } from 'lucide-react';
import {
  OFFICIAL_LOGO_FALLBACK_SRC,
  OFFICIAL_LOGO_SRC,
  type WorkspaceProject,
} from '../data/projects';

export type LaunchPhase = 'preparing' | 'navigating' | 'error';

interface LaunchOverlayProps {
  project: WorkspaceProject | null;
  targetUrl: string | null;
  phase: LaunchPhase;
  statusMessage: string;
  errorDetail: string | null;
  onCancel: () => void;
  onRetry: () => void;
}

export const LaunchOverlay: React.FC<LaunchOverlayProps> = ({
  project,
  targetUrl,
  phase,
  statusMessage,
  errorDetail,
  onCancel,
  onRetry,
}) => {
  if (!project || !targetUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-overlay-title"
      data-testid="launch-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#32060A]/85 p-4 backdrop-blur-md"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#E8B14B]/40 bg-gradient-to-b from-[#FFFBF2] to-[#F9EEDB] p-8 text-center shadow-[0_24px_64px_rgba(20,2,4,0.55)]">
        {/* Top golden accent stripe */}
        <div
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#5A0D14] via-[#E8B14B] to-[#5A0D14]"
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel workspace launch"
          className="absolute top-4 right-4 rounded-full p-2 text-[#6B4C46] transition-colors hover:bg-[#EAD9BE]/60 hover:text-[#5A0D14] focus-visible:outline-2 focus-visible:outline-[#5A0D14]"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Mother's Hut Official Logo with Animated Ring */}
        <div className="relative mx-auto mt-2 flex h-32 w-32 items-center justify-center">
          {phase !== 'error' && (
            <div
              className="animate-mh-spin absolute inset-0 rounded-full border-3 border-[#EAD9BE] border-t-[#E5A73B] border-r-[#5A0D14]"
              aria-hidden="true"
            />
          )}
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md ring-1 ring-[#EAD9BE]">
            <img
              src={OFFICIAL_LOGO_SRC}
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src !== OFFICIAL_LOGO_FALLBACK_SRC) {
                  img.src = OFFICIAL_LOGO_FALLBACK_SRC;
                }
              }}
              alt="Mother's Hut official logo"
              referrerPolicy="no-referrer"
              className="h-full w-full rounded-xl object-contain"
            />
          </div>
        </div>

        <h2
          id="launch-overlay-title"
          className="font-display mt-5 text-xl font-bold text-[#5A0D14]"
        >
          {project.name}
        </h2>

        {phase !== 'error' ? (
          <div className="mt-2.5 space-y-4">
            <p className="text-[13px] font-medium text-[#4D302C]" role="status" aria-live="polite">
              {statusMessage}
            </p>

            {/* Smooth branded progress bar */}
            <div
              className="mx-auto h-1.5 w-56 overflow-hidden rounded-full bg-[#EAD9BE]"
              aria-hidden="true"
            >
              <div
                className={`h-full rounded-full bg-gradient-to-r from-[#5A0D14] via-[#E5A73B] to-[#5A0D14] ${
                  phase === 'navigating' ? 'w-full transition-all duration-300' : 'w-1/2 animate-mh-progress'
                }`}
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-[#D8BE95] bg-white px-5 py-2 text-xs font-semibold text-[#5A0D14] transition-colors hover:bg-[#F6E8D0] focus-visible:outline-2 focus-visible:outline-[#5A0D14]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="mx-auto flex max-w-sm items-start gap-2.5 rounded-xl border border-[#DFB5A8] bg-[#FDF1ED] p-3.5 text-left text-xs text-[#6B1D1A]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9B221E]" aria-hidden="true" />
              <p className="leading-relaxed">
                {errorDetail ||
                  'Unable to reach this application right now. The cloud service may be waking up or temporarily offline.'}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5A0D14] px-5 py-2.5 text-sm font-semibold text-[#FDF5E6] shadow-sm transition-colors hover:bg-[#73121B] focus-visible:outline-2 focus-visible:outline-[#E5A73B]"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>Retry Connection</span>
              </button>

              <a
                href={targetUrl}
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8BE95] bg-white px-5 py-2.5 text-sm font-semibold text-[#5A0D14] transition-colors hover:bg-[#F6E8D0] focus-visible:outline-2 focus-visible:outline-[#5A0D14]"
              >
                <span>Open Directly</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-semibold text-[#6B4C46] underline decoration-[#D8BE95] underline-offset-4 hover:text-[#5A0D14]"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
