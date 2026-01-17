"use client";

import Link from "next/link";
import { Youtube, Twitter, ExternalLink } from "lucide-react";
import { SITE_NAME_EN, SITE_NAME_JP, SITE_TITLE_FONT_CLASS } from "@/lib/branding";
import { cn } from "@/lib/utils";

const footerLinks = [
  { label: "利用規約", href: "/terms" },
  { label: "プライバシーポリシー", href: "/privacy" }
];

const socialLinks = [
  { label: "一般社団法人NAMIDAサポート協会", href: "https://web.namisapo.com/", icon: ExternalLink },
  { label: "メンタルAIチーム", href: "https://www.mentalai.team/", icon: ExternalLink },
  { label: "YouTube", href: "https://www.youtube.com/channel/UCHWAYMRP3Ia7CgH6sg1USGg", icon: Youtube },
  { label: "X (Twitter)", href: "https://x.com/iamiamthatthat", icon: Twitter }
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[#f0e4d8] bg-gradient-to-br from-[#fff8f0] via-[#f8f3ff] to-[#fff8f2]">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 text-[#51433c] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.4em] text-[#a4938a]">{SITE_NAME_EN}</p>
          <p className={cn("mt-2 text-lg text-[#51433c]", SITE_TITLE_FONT_CLASS)}>{SITE_NAME_JP}</p>
          <p className="mt-1 text-xs text-[#a4938a]">心に寄り添うケアをすべての人へ。</p>
        </div>

        <div className="flex flex-1 flex-col gap-6 text-sm md:flex-row md:items-center md:justify-end">
          <div className="flex gap-6">
            {footerLinks.map((item) => (
              <Link key={item.href} href={item.href} className="text-[#5a4a42] hover:text-[#d59da9]">
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#f0e4d8] px-3 py-1 text-xs font-semibold text-[#51433c] hover:bg-white/80"
              >
                <social.icon className="h-4 w-4" />
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
