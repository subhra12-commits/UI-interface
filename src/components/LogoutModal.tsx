import React from 'react';
import { LogOut, RotateCcw } from 'lucide-react';
import { OFFICIAL_LOGO_FALLBACK_SRC, OFFICIAL_LOGO_SRC } from '../data/projects';

interface LogoutModalProps {
  open: boolean;
  isSignedOut: boolean;
  onCancel: () => void;
  onConfirmLogout: () => void;
  onSignBackIn: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  open,
  isSignedOut,
  onCancel,
  onConfirmLogout,
  onSignBackIn,
}) => {
  if (isSignedOut) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDF5E6] p-6 text-center">
        <div className="w-full max-w-md rounded-3xl border border-[#EAD9BE] bg-[#FFFBF2] p-8 shadow-xl">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-[#EAD9BE]">
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

          <h1 className="font-display mt-6 text-2xl font-bold text-[#5A0D14]">
            Signed Out of Workspace
          </h1>
          <p className="mt-2 text-sm text-[#4D302C]">
            Your Mother&apos;s Hut Restaurant Intelligence session has ended safely.
          </p>

          <button
            type="button"
            onClick={onSignBackIn}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#5A0D14] px-6 py-2.5 text-sm font-semibold text-[#FDF5E6] shadow-sm transition-colors hover:bg-[#73121B] focus-visible:outline-2 focus-visible:outline-[#E5A73B]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Return to Workspace</span>
          </button>
        </div>
      </div>
    );
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#32060A]/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#EAD9BE] bg-[#FFFBF2] p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#5A0D14]/10 text-[#5A0D14]">
          <LogOut className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 id="logout-dialog-title" className="font-display mt-4 text-xl font-bold text-[#5A0D14]">
          Log out of Mother&apos;s Hut?
        </h2>
        <p className="mt-1.5 text-sm text-[#4D302C]">
          You can return to your workspace anytime from the session screen.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#D8BE95] bg-white px-5 py-2 text-sm font-semibold text-[#5A0D14] transition-colors hover:bg-[#F6E8D0]"
          >
            Stay Signed In
          </button>
          <button
            type="button"
            onClick={onConfirmLogout}
            className="rounded-full bg-[#5A0D14] px-5 py-2 text-sm font-semibold text-[#FDF5E6] shadow-sm transition-colors hover:bg-[#73121B]"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
