"use client";

import Link from "next/link";
import { Youtube, Twitter, ExternalLink } from "lucide-react";

const footerLinks = [
  { label: "利用規約", href: "/terms" },
  { label: "プライバシーポリシー", href: "/privacy" }
];

const socialLinks = [
  { label: "一般社団法人NAMIDAサポート協会", href: "https://web.namisapo.com/", icon: ExternalLink },
  { label: "YouTube", href: "https://www.youtube.com/channel/UCHWAYMRP3Ia7CgH6sg1USGg", icon: Youtube },
  { label: "X (Twitter)", href: "https://x.com/iamiamthatthat", icon: Twitter }
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-tape-beige bg-white/70">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 text-tape-brown md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.4em] text-tape-light-brown">TAPE PSYCHOLOGY</p>
          <p className="mt-2 text-lg font-bold text-tape-brown">テープ式心理学</p>
          <p className="mt-1 text-xs text-tape-light-brown">心に寄り添うケアをすべての人へ。</p>
        </div>

        <div className="flex flex-1 flex-col gap-6 text-sm md:flex-row md:items-center md:justify-end">
          <div className="flex gap-6">
            {footerLinks.map((item) => (
              <Link key={item.href} href={item.href} className="text-tape-brown hover:text-tape-pink">
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
                className="inline-flex items-center gap-2 rounded-full border border-tape-beige px-3 py-1 text-xs font-semibold text-tape-brown hover:bg-tape-cream"
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
