import React from 'react';
import { ArrowRight, ChefHat, Settings2, ShieldCheck, Sparkles, TrendingUp, Users } from 'lucide-react';
import type { WorkspaceProject } from '../data/projects';
import { PROJECT_CARD_IMAGES } from '../data/projectImages';
import { CardLeafWatermark } from './BotanicalOrnament';

interface ProjectCardProps {
  project: WorkspaceProject;
  resolvedUrl: string | null;
  onOpen: (project: WorkspaceProject) => void;
  onConfigureUrl?: (project: WorkspaceProject) => void;
}

const CurveBadgeIcon: React.FC<{ badge: WorkspaceProject['visualBadge'] }> = ({ badge }) => {
  const renderIcon = () => {
    switch (badge) {
      case 'meal-verifier':
        return <ShieldCheck className="h-6 w-6 text-[#FFF4DF]" strokeWidth={2} />;

      case 'kitchen-hygiene':
        return (
          <div className="relative flex items-center justify-center">
            <ChefHat className="h-6 w-6 text-[#FFF4DF]" strokeWidth={1.9} />
            <Sparkles
              className="absolute -top-1.5 -right-2 h-3.5 w-3.5 text-[#F6C361]"
              strokeWidth={2.2}
            />
          </div>
        );

      case 'customer-marketing':
        return (
          <div className="relative flex items-center justify-center">
            <Users className="h-5 w-5 -translate-x-0.5 translate-y-0.5 text-[#FFF4DF]" strokeWidth={2} />
            <TrendingUp
              className="absolute -top-1.5 -right-2 h-3.5 w-3.5 text-[#F6C361]"
              strokeWidth={2.4}
            />
          </div>
        );

      case 'smart-parking':
        return (
          <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none" aria-hidden="true">
            {/* Smart Parking P frame + signal arc */}
            <rect
              x="3.5"
              y="5.5"
              width="16"
              height="19"
              rx="3.5"
              stroke="#FFF4DF"
              strokeWidth="2"
            />
            <path
              d="M9.5 19.5V10.5H13C14.6 10.5 15.7 11.5 15.7 13C15.7 14.5 14.6 15.5 13 15.5H9.5"
              stroke="#FFF4DF"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 7.5C22.4 8.2 23.4 9.2 24 10.6"
              stroke="#F6C361"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M21.5 4.2C23.9 5.3 25.7 7.1 26.8 9.5"
              stroke="#F6C361"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#FFF4DF] bg-[#5A0D14] shadow-[0_6px_18px_rgba(59,6,11,0.30)] ring-2 ring-[#E8AE47]/70 transition-transform duration-200 group-hover:scale-105"
      aria-hidden="true"
    >
      {renderIcon()}
    </div>
  );
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  resolvedUrl,
  onOpen,
  onConfigureUrl,
}) => {
  const isUnconfigured = project.configurable && !resolvedUrl;

  return (
    <article
      data-testid={`project-card-${project.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#EAD9BE] bg-[#FFF9EE] shadow-[0_6px_22px_-6px_rgba(90,13,20,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-8px_rgba(90,13,20,0.17)] sm:flex-row"
    >
      {/* Left Media Area with Signature Yellow Slight S-Curve */}
      <div className="relative h-36 w-full shrink-0 bg-[#43070C] sm:h-auto sm:min-h-[142px] sm:w-[39%] sm:[@media(min-height:840px)]:min-h-[166px] xl:w-[40%]">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={PROJECT_CARD_IMAGES[project.id]}
            alt={project.imageAlt}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />

          {/* Subtle warm maroon vignette for cohesion */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#3B060B]/45 via-transparent to-transparent"
            aria-hidden="true"
          />

          {/* Mobile Horizontal Slight S-Curve Yellow Border */}
          <svg
            viewBox="0 0 400 26"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 -bottom-px h-5 w-full sm:hidden"
            aria-hidden="true"
          >
            <path
              d="M0 15C110 4 155 4 200 13S290 22 400 11V26H0V15Z"
              fill="#FFF9EE"
            />
            <path
              d="M0 15C110 4 155 4 200 13S290 22 400 11"
              stroke="#E8AE47"
              strokeWidth="4.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>

          {/* Desktop/Tablet Vertical Slight S-Curve Yellow Border */}
          <svg
            viewBox="0 0 64 220"
            preserveAspectRatio="none"
            className="pointer-events-none absolute top-0 -right-px hidden h-full w-11 sm:block"
            aria-hidden="true"
          >
            <path
              d="M22 0C40 42 40 76 31 110S22 178 40 220H64V0H22Z"
              fill="#FFF9EE"
            />
            <path
              d="M22 0C40 42 40 76 31 110S22 178 40 220"
              stroke="#E8AE47"
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Icon Badge Centered Right Along the Yellow S-Curve Border */}
        <div
          data-testid={`card-badge-${project.id}`}
          className="pointer-events-none absolute right-5 -bottom-4 z-20 sm:top-1/2 sm:right-[22px] sm:bottom-auto sm:translate-x-1/2 sm:-translate-y-1/2"
        >
          <CurveBadgeIcon badge={project.visualBadge} />
        </div>
      </div>

      {/* Right Content Panel */}
      <div className="relative flex flex-1 flex-col justify-between px-4 pt-6 pb-4 sm:py-4 sm:pr-5 sm:pl-7 lg:py-4.5 lg:pr-6 lg:pl-8 [@media(min-height:840px)]:py-5 [@media(min-height:840px)]:pr-6 [@media(min-height:840px)]:pl-9">
        <CardLeafWatermark className="pointer-events-none absolute right-1 bottom-0 h-14 w-14 opacity-80 [@media(min-height:840px)]:h-18 [@media(min-height:840px)]:w-18" />

        <div className="relative z-10 my-auto">
          <div className="mb-1.5 h-[3px] w-8 rounded-full bg-[#E5A73B] [@media(min-height:840px)]:mb-2.5" aria-hidden="true" />
          <h2 className="font-display text-[17px] font-bold leading-[1.28] text-[#5A0D14] sm:text-[17.5px] lg:text-[18.5px] [@media(min-height:840px)]:text-[20.5px]">
            {project.name}
          </h2>
          <p className="mt-1.5 text-[13.5px] leading-snug text-[#4D302C] lg:text-[14px] [@media(min-height:840px)]:mt-2 [@media(min-height:840px)]:text-[15px] [@media(min-height:840px)]:leading-relaxed">
            {project.description}
          </p>
        </div>

        <div className="relative z-10 mt-3 flex flex-wrap items-center gap-3 [@media(min-height:840px)]:mt-3.5">
          <button
            type="button"
            onClick={() => onOpen(project)}
            className="inline-flex items-center gap-2 rounded-full bg-[#5A0D14] px-6 py-2 text-[14px] font-semibold text-[#FDF5E6] shadow-sm transition-all duration-200 hover:bg-[#73121B] active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A73B]"
          >
            <span>Open</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          </button>

          {project.configurable && (
            <div className="flex items-center gap-2 text-xs text-[#6B4C46]">
              {isUnconfigured ? (
                <span>Endpoint pending setup</span>
              ) : (
                <>
                  <span>Custom URL ready</span>
                  {onConfigureUrl && (
                    <button
                      type="button"
                      onClick={() => onConfigureUrl(project)}
                      aria-label={`Configure URL for ${project.name}`}
                      title="Edit configured URL"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#DFC9A4] bg-white/75 text-[#5A0D14] transition-colors hover:bg-[#F6E9D2] focus-visible:outline-2 focus-visible:outline-[#5A0D14]"
                    >
                      <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
