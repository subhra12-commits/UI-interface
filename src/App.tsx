import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import {
  HERO_PAVILION_IMAGE,
  OFFICIAL_LOGO_FALLBACK_SRC,
  OFFICIAL_LOGO_SRC,
  WORKSPACE_PROJECTS,
  type ProjectId,
  type WorkspaceProject,
} from './data/projects';
import {
  clearCustomProjectUrl,
  loadCustomProjectUrl,
  probeWorkspaceEndpoint,
  resolveProjectUrl,
  saveCustomProjectUrl,
} from './utils/workspaceLaunch';
import { BotanicalCornerLeaves } from './components/BotanicalOrnament';
import { Sidebar, type ActiveSection } from './components/Sidebar';
import { ProjectCard } from './components/ProjectCard';
import { HelpSupportView } from './components/HelpSupportView';
import { LaunchOverlay, type LaunchPhase } from './components/LaunchOverlay';
import { ConfigureUrlModal } from './components/ConfigureUrlModal';
import { AccountMenu } from './components/AccountMenu';
import { LogoutModal } from './components/LogoutModal';

interface LaunchState {
  project: WorkspaceProject;
  targetUrl: string;
  phase: LaunchPhase;
  statusMessage: string;
  errorDetail: string | null;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [customUrls, setCustomUrls] = useState<Partial<Record<ProjectId, string | null>>>(() => ({
    'customer-marketing': loadCustomProjectUrl('customer-marketing'),
  }));

  const [configuringProject, setConfiguringProject] = useState<WorkspaceProject | null>(null);
  const [launchState, setLaunchState] = useState<LaunchState | null>(null);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isSignedOut, setIsSignedOut] = useState(false);

  const launchSequenceRef = useRef(0);

  const cancelLaunch = useCallback(() => {
    launchSequenceRef.current += 1;
    setLaunchState(null);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && launchState) {
        cancelLaunch();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [launchState, cancelLaunch]);

  const startWorkspaceLaunch = useCallback(async (project: WorkspaceProject, url: string) => {
    const seqId = ++launchSequenceRef.current;

    setLaunchState({
      project,
      targetUrl: url,
      phase: 'preparing',
      statusMessage: 'Preparing your workspace...',
      errorDetail: null,
    });

    const stageTimer = window.setTimeout(() => {
      if (launchSequenceRef.current !== seqId) return;
      setLaunchState((prev) =>
        prev && prev.phase === 'preparing'
          ? { ...prev, statusMessage: "Connecting to Mother's Hut services..." }
          : prev
      );
    }, 600);

    try {
      const [probe] = await Promise.all([
        probeWorkspaceEndpoint(url, { timeoutMs: 7000 }),
        new Promise<void>((resolve) => window.setTimeout(resolve, 1100)),
      ]);

      window.clearTimeout(stageTimer);
      if (launchSequenceRef.current !== seqId) return;

      if (!probe.reachable) {
        setLaunchState({
          project,
          targetUrl: url,
          phase: 'error',
          statusMessage: 'Connection interrupted',
          errorDetail: probe.timedOut
            ? `${project.name} took too long to respond. Cloud services may still be waking up.`
            : `Could not verify connectivity to ${project.name}. Please check your internet connection or open directly.`,
        });
        return;
      }

      setLaunchState({
        project,
        targetUrl: url,
        phase: 'navigating',
        statusMessage: `Opening ${project.name}...`,
        errorDetail: null,
      });

      window.setTimeout(() => {
        if (launchSequenceRef.current !== seqId) return;
        window.location.assign(url);
      }, 220);
    } catch {
      window.clearTimeout(stageTimer);
      if (launchSequenceRef.current !== seqId) return;
      setLaunchState({
        project,
        targetUrl: url,
        phase: 'error',
        statusMessage: 'Unable to open workspace',
        errorDetail: `An unexpected error occurred while connecting to ${project.name}.`,
      });
    }
  }, []);

  const handleOpenProject = useCallback(
    (project: WorkspaceProject) => {
      const targetUrl = resolveProjectUrl(project, customUrls);
      if (!targetUrl) {
        setConfiguringProject(project);
        return;
      }
      void startWorkspaceLaunch(project, targetUrl);
    },
    [customUrls, startWorkspaceLaunch]
  );

  const handleSaveCustomUrl = useCallback(
    (project: WorkspaceProject, normalizedUrl: string, launchAfterSave: boolean) => {
      saveCustomProjectUrl(project.id, normalizedUrl);
      setCustomUrls((prev) => ({ ...prev, [project.id]: normalizedUrl }));
      setConfiguringProject(null);
      if (launchAfterSave) {
        void startWorkspaceLaunch(project, normalizedUrl);
      }
    },
    [startWorkspaceLaunch]
  );

  const handleClearCustomUrl = useCallback((project: WorkspaceProject) => {
    clearCustomProjectUrl(project.id);
    setCustomUrls((prev) => ({ ...prev, [project.id]: null }));
    setConfiguringProject(null);
  }, []);

  if (isSignedOut) {
    return (
      <LogoutModal
        open={false}
        isSignedOut={true}
        onCancel={() => setIsSignedOut(false)}
        onConfirmLogout={() => setIsSignedOut(true)}
        onSignBackIn={() => {
          setIsSignedOut(false);
          setActiveSection('dashboard');
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-[#FDF5E6] text-[#3B1715]">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onLogout={() => setLogoutModalOpen(true)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#EAD9BE] bg-[#5A0D14] px-4 py-2.5 text-[#FDF5E6] shadow-md lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg p-2 text-[#FDF5E6] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#F2B94B]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <img
                src={OFFICIAL_LOGO_SRC}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== OFFICIAL_LOGO_FALLBACK_SRC) {
                    img.src = OFFICIAL_LOGO_FALLBACK_SRC;
                  }
                }}
                alt="Mother's Hut logo"
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-lg bg-white p-0.5 object-contain"
              />
              <span className="font-display text-base font-bold tracking-tight whitespace-nowrap">
                Mother&apos;s Hut
              </span>
            </div>
          </div>

          <AccountMenu
            onNavigate={setActiveSection}
            onLogout={() => setLogoutModalOpen(true)}
          />
        </header>

        {/* Hero Banner */}
        <section
          aria-label="Workspace Welcome"
          className="relative shrink-0 overflow-hidden bg-[#FDF5E6] pt-2.5 pb-6 sm:pt-3 sm:pb-7 lg:pt-3 lg:pb-7 [@media(min-height:840px)]:pt-5 [@media(min-height:840px)]:pb-11"
        >
          {/* Uploaded Mother's Hut building photo blended transparently on top-right */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden sm:w-[66%] lg:w-[60%]">
            <img
              src={HERO_PAVILION_IMAGE}
              alt="Mother's Hut flagship thatched restaurant building"
              referrerPolicy="no-referrer"
              className="h-full w-full scale-[1.24] object-cover object-[20%_46%] opacity-38 sm:opacity-78"
            />
            {/* Soft transparent fade from cream canvas on the left, top & bottom */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#FDF5E6] via-[#FDF5E6]/82 to-transparent sm:via-[#FDF5E6]/55 sm:to-[#FDF5E6]/10"
              aria-hidden="true"
            />
            <div
              className="absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-[#FDF5E6]/55 to-transparent"
              aria-hidden="true"
            />
            <div
              className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#FDF5E6] via-[#FDF5E6]/65 to-transparent"
              aria-hidden="true"
            />
          </div>

          {/* Subtle botanical leaves on top-left */}
          <BotanicalCornerLeaves className="pointer-events-none absolute -top-2 -left-2 h-24 w-32 opacity-75 lg:h-28 lg:w-36" />

          <div className="relative z-10 mx-auto w-full max-w-[1360px] px-4 sm:px-7 lg:px-10 xl:px-12">
            {/* Desktop Top-Right Utility Controls */}
            <div className="hidden justify-end lg:flex">
              <AccountMenu
                onNavigate={setActiveSection}
                onLogout={() => setLogoutModalOpen(true)}
              />
            </div>

            <div className="max-w-xl pt-1 sm:pt-1.5 lg:pt-0">
              <h1 className="font-display text-2xl font-bold tracking-tight text-[#5A0D14] text-balance sm:text-[1.7rem] lg:text-[1.85rem] lg:leading-[1.15] [@media(min-height:840px)]:text-[2.15rem]">
                Welcome to Mother&apos;s Hut
              </h1>
              <p className="font-display mt-0.5 text-[15px] italic text-[#4A2520] sm:text-base [@media(min-height:840px)]:mt-1 [@media(min-height:840px)]:text-[1.125rem]">
                {activeSection === 'dashboard'
                  ? 'Your Restaurant Intelligence Workspace'
                  : 'Care, Support & Operations Assistance'}
              </p>

              {/* Warm golden swoosh accent */}
              <svg
                viewBox="0 0 340 22"
                fill="none"
                className="mt-1 h-3 w-52 sm:w-68 [@media(min-height:840px)]:mt-2 [@media(min-height:840px)]:h-3.5"
                aria-hidden="true"
              >
                <path
                  d="M2 16C92 6 205 6 334 10"
                  stroke="#E5A73B"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M196 14C244 12 292 14 336 18"
                  stroke="#F3C76A"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Sweeping maroon & gold sculptural wave edge matching reference */}
          <svg
            viewBox="0 0 1200 84"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-7 w-full sm:h-8 [@media(min-height:840px)]:h-11"
            aria-hidden="true"
          >
            <path
              d="M0 64C290 74 520 58 760 28C940 6 1085 6 1200 14V84H0V64Z"
              fill="#5A0D14"
            />
            <path
              d="M0 64C290 74 520 58 760 28C940 6 1085 6 1200 14"
              stroke="#E5A73B"
              strokeWidth="4"
              fill="none"
            />
            <path
              d="M0 68C320 78 620 68 890 52C1040 43 1135 48 1200 58V84H0V68Z"
              fill="#FDF5E6"
            />
          </svg>
        </section>

        {/* Main Workspace Content */}
        <main className="relative flex flex-1 flex-col justify-center px-4 py-3 sm:px-7 lg:px-10 lg:py-4 xl:px-12 [@media(min-height:840px)]:py-6">
          {/* Subtle bottom-left botanical corner motif */}
          <BotanicalCornerLeaves
            className="pointer-events-none fixed bottom-0 left-60 hidden h-28 w-36 -rotate-90 opacity-45 lg:block"
            color="#D29E4B"
          />

          <div className="relative z-10 mx-auto flex w-full max-w-[1360px] flex-1 flex-col justify-center">
            {activeSection === 'dashboard' ? (
              <div
                className="grid w-full flex-1 grid-cols-1 gap-4 lg:max-h-[480px] lg:grid-cols-2 lg:grid-rows-2 lg:gap-6 xl:gap-8 lg:[@media(min-height:840px)]:max-h-[500px]"
                data-testid="projects-grid"
              >
                {WORKSPACE_PROJECTS.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    resolvedUrl={resolveProjectUrl(project, customUrls)}
                    onOpen={handleOpenProject}
                    onConfigureUrl={(proj) => setConfiguringProject(proj)}
                  />
                ))}
              </div>
            ) : (
              <HelpSupportView onBackToDashboard={() => setActiveSection('dashboard')} />
            )}
          </div>
        </main>

        {/* Branded Footer */}
        <footer className="relative z-10 mx-auto w-full max-w-[1360px] shrink-0 px-4 pt-1 pb-2.5 sm:px-7 lg:px-10 xl:px-12 [@media(min-height:840px)]:pb-4">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px flex-1 bg-[#D8C29F]" aria-hidden="true" />
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DFC9A4] bg-white p-0.5 shadow-xs [@media(min-height:840px)]:h-9 [@media(min-height:840px)]:w-9">
              <img
                src={OFFICIAL_LOGO_SRC}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== OFFICIAL_LOGO_FALLBACK_SRC) {
                    img.src = OFFICIAL_LOGO_FALLBACK_SRC;
                  }
                }}
                alt="Mother's Hut emblem"
                referrerPolicy="no-referrer"
                className="h-full w-full rounded object-contain"
              />
            </div>
            <span className="h-px flex-1 bg-[#D8C29F]" aria-hidden="true" />
          </div>

          <p className="mt-1 text-center text-[9.5px] font-semibold tracking-[0.2em] text-[#5A0D14]/85 uppercase [@media(min-height:840px)]:mt-1.5 [@media(min-height:840px)]:text-[10px]">
            Smart Solutions &bull; Better Restaurant Experience
          </p>
        </footer>
      </div>

      {/* Branded Launch Overlay */}
      <LaunchOverlay
        project={launchState?.project ?? null}
        targetUrl={launchState?.targetUrl ?? null}
        phase={launchState?.phase ?? 'preparing'}
        statusMessage={launchState?.statusMessage ?? ''}
        errorDetail={launchState?.errorDetail ?? null}
        onCancel={cancelLaunch}
        onRetry={() => {
          if (launchState) {
            void startWorkspaceLaunch(launchState.project, launchState.targetUrl);
          }
        }}
      />

      {/* Configurable URL Dialog */}
      <ConfigureUrlModal
        project={configuringProject}
        currentUrl={
          configuringProject ? resolveProjectUrl(configuringProject, customUrls) : null
        }
        onClose={() => setConfiguringProject(null)}
        onSave={handleSaveCustomUrl}
        onClear={handleClearCustomUrl}
      />

      {/* Logout Confirmation Dialog */}
      <LogoutModal
        open={logoutModalOpen}
        isSignedOut={false}
        onCancel={() => setLogoutModalOpen(false)}
        onConfirmLogout={() => {
          setLogoutModalOpen(false);
          setIsSignedOut(true);
        }}
        onSignBackIn={() => setIsSignedOut(false)}
      />
    </div>
  );
}
