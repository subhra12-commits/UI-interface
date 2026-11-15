import React from 'react';
import { Clock, ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { MOTHERS_HUT_CONTACT } from '../data/projects';
import { formatMailtoHref, formatTelHref } from '../utils/workspaceLaunch';
import { CardLeafWatermark } from './BotanicalOrnament';

interface HelpSupportViewProps {
  onBackToDashboard: () => void;
}

export const HelpSupportView: React.FC<HelpSupportViewProps> = ({ onBackToDashboard }) => {
  const emailHref = formatMailtoHref(
    MOTHERS_HUT_CONTACT.email,
    "Mother's Hut Workspace Support Inquiry"
  );
  const phoneHref = formatTelHref(MOTHERS_HUT_CONTACT.phoneE164);

  return (
    <section
      aria-labelledby="help-support-heading"
      className="mx-auto w-full max-w-5xl space-y-6"
    >
      {/* Primary Contact Channels */}
      <div className="relative overflow-hidden rounded-2xl border border-[#EAD9BE] bg-[#FFF9EE] p-5 shadow-[0_6px_22px_-6px_rgba(90,13,20,0.10)] sm:p-6">
        <CardLeafWatermark className="pointer-events-none absolute right-2 bottom-0 h-28 w-28 opacity-75" />

        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 h-[3px] w-9 rounded-full bg-[#E5A73B]" aria-hidden="true" />
            <h2
              id="help-support-heading"
              className="font-display text-2xl font-bold text-[#5A0D14] sm:text-[1.65rem]"
            >
              Mother&apos;s Hut Help &amp; Support
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#4D302C] sm:text-[15px]">
              Reach Mother&apos;s Hut operations and technical care directly for workspace access,
              restaurant system assistance, or module connection support.
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToDashboard}
            className="self-start rounded-full border border-[#D8BE95] bg-white px-5 py-2 text-sm font-semibold text-[#5A0D14] transition-colors hover:bg-[#F8ECDA] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A0D14]"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Clickable Official Email & Phone */}
        <div className="relative z-10 mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <a
            href={emailHref}
            className="group flex items-start gap-4 rounded-xl border border-[#EAD9BE] bg-white/90 p-4.5 transition-all duration-200 hover:border-[#D99E3D] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A0D14]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5A0D14] text-[#F6C361] shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold tracking-wide text-[#7A5448]">
                Official Support Email
              </div>
              <div className="mt-0.5 break-all text-[15px] font-bold text-[#5A0D14] underline decoration-[#E5A73B]/70 underline-offset-4 group-hover:decoration-[#5A0D14] sm:text-[17px]">
                {MOTHERS_HUT_CONTACT.email}
              </div>
              <p className="mt-1 text-xs text-[#6B4C46]">
                Click to compose an email in your mail client
              </p>
            </div>
          </a>

          <a
            href={phoneHref}
            className="group flex items-start gap-4 rounded-xl border border-[#EAD9BE] bg-white/90 p-4.5 transition-all duration-200 hover:border-[#D99E3D] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A0D14]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5A0D14] text-[#F6C361] shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Phone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold tracking-wide text-[#7A5448]">
                Official Support Phone
              </div>
              <div className="mt-0.5 text-[15px] font-bold tabular-nums text-[#5A0D14] underline decoration-[#E5A73B]/70 underline-offset-4 group-hover:decoration-[#5A0D14] sm:text-[17px]">
                {MOTHERS_HUT_CONTACT.phoneDisplay}
              </div>
              <p className="mt-1 text-xs text-[#6B4C46]">
                Click to call Mother&apos;s Hut helpline directly
              </p>
            </div>
          </a>
        </div>

        {/* Location, Hours, Official Website */}
        <div className="relative z-10 mt-5 grid grid-cols-1 gap-4 border-t border-[#EAD9BE] pt-5 sm:grid-cols-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#5A0D14]" aria-hidden="true" />
            <div>
              <div className="text-xs font-semibold text-[#5A0D14]">Location</div>
              <p className="mt-0.5 text-[13.5px] text-[#4D302C]">{MOTHERS_HUT_CONTACT.address}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#5A0D14]" aria-hidden="true" />
            <div>
              <div className="text-xs font-semibold text-[#5A0D14]">Operating Hours</div>
              <p className="mt-0.5 text-[13.5px] tabular-nums text-[#4D302C]">
                {MOTHERS_HUT_CONTACT.hours}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[#5A0D14]" aria-hidden="true" />
            <div>
              <div className="text-xs font-semibold text-[#5A0D14]">Official Website</div>
              <a
                href={MOTHERS_HUT_CONTACT.officialWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-[13.5px] font-medium text-[#5A0D14] underline decoration-[#E5A73B] underline-offset-4 hover:text-[#7A141E]"
              >
                <span>www.mothershut.com</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Quick Guidance */}
      <div className="rounded-2xl border border-[#EAD9BE] bg-[#FFF9EE] p-5 shadow-[0_6px_22px_-6px_rgba(90,13,20,0.08)] sm:p-6">
        <h3 className="font-display text-[19px] font-bold text-[#5A0D14]">
          Workspace Quick Guidance
        </h3>
        <div className="mt-3.5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#5A0D14]">01. Seamless Launching</h4>
            <p className="text-[13.5px] leading-relaxed text-[#4D302C]">
              Selecting <strong>Open</strong> on any application card verifies service readiness and
              transitions you directly into that workspace.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#5A0D14]">02. Service Warm-Up</h4>
            <p className="text-[13.5px] leading-relaxed text-[#4D302C]">
              Cloud-hosted tools may take a few seconds to wake up after idle periods. If a timeout
              occurs, choose <strong>Retry Connection</strong> or <strong>Open Directly</strong>.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#5A0D14]">03. Integrated Modules</h4>
            <p className="text-[13.5px] leading-relaxed text-[#4D302C]">
              All four modules—Meal Verifier, Kitchen Hygiene, Customer Grouping &amp; Smart Parking
              Analyzer—connect directly from this central workspace.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
