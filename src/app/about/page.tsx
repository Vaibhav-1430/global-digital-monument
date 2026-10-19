import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import {
  Globe2,
  Sparkles,
  Heart,
  Compass,
  Layers,
  ShieldCheck,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About the Monument — Global Digital Monument',
  description:
    'Learn about Global Digital Monument, our interactive 3D Earth experience, our mission of human connection, and our transparent digital platform policies.',
};

export default function AboutPage() {
  return (
    <LegalPageLayout
      title="About Global Digital Monument"
      subtitle="An interactive digital monument uniting voices, memories, and tributes across our shared planet."
      category="Project Overview & Mission"
      lastUpdated="October 2026"
    >
      {/* Non-profit / Charity Disclosure Banner */}
      <section
        aria-label="Important Regulatory Disclosure"
        className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-amber-200"
      >
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm leading-relaxed space-y-1">
          <strong className="text-amber-300 font-mono uppercase block text-xs tracking-wider">
            Important Platform Disclosure
          </strong>
          <p>
            Global Digital Monument is an independent digital art project and interactive software experience. It is <strong>NOT</strong> a registered charity, non-profit organization (NGO), or tax-deductible donation platform. Payments represent voluntary digital participation fees for igniting, displaying, and maintaining user lights on the 3D globe. Contributions do <strong>not</strong> qualify for tax deductions under Section 80G of the Indian Income Tax Act, Section 501(c)(3) of the US Internal Revenue Code, or equivalent foreign provisions.
          </p>
        </div>
      </section>

      {/* The Vision */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
          <Globe2 className="w-5 h-5 text-[#7DD3FC]" />
          <span>The Vision: One Planet, Millions of Stories</span>
        </h2>
        <p>
          Seen from deep space, national borders disappear into vast oceans, continental contours, and a fragile blue atmosphere. Global Digital Monument was created to celebrate this shared human reality: a global canvas where anyone, anywhere on Earth, can ignite a permanent point of light.
        </p>
        <p>
          Whether dedicated to a loved one, a milestone celebration, a prayer for peace, or a personal pledge for future generations, each marker joins thousands of others in an ever-growing, collective monument to human individuality and unity.
        </p>
      </section>

      {/* Guiding Principles */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          Guiding Principles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFC857]/15 flex items-center justify-center text-[#FFC857]">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-medium text-[#F5F7FA]">Every Light Matters</h3>
            <p className="text-xs text-[#8993A7] leading-relaxed">
              Every participant claims an authentic presence on the 3D globe, accompanied by their personal message or chosen dedication.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7DD3FC]/15 flex items-center justify-center text-[#7DD3FC]">
              <Heart className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-medium text-[#F5F7FA]">Dignity & Respect</h3>
            <p className="text-xs text-[#8993A7] leading-relaxed">
              We maintain a safe, welcoming, and spam-free space. All contributions are subject to transparent community standards.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-400/15 flex items-center justify-center text-emerald-400">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-medium text-[#F5F7FA]">Authentic Coordinates</h3>
            <p className="text-xs text-[#8993A7] leading-relaxed">
              Lights can be placed precisely by picking on the 3D globe, using approximate regional centroids, or via browser location with consent.
            </p>
          </div>
        </div>
      </section>

      {/* Technology & Architecture */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-[#FFC857]" />
          <span>Interactive 3D Technology</span>
        </h2>
        <p>
          Global Digital Monument is engineered using modern WebGL technologies, combining Three.js, React Three Fiber, and high-precision spatial math. Every glowing marker is mapped to three-dimensional spherical coordinates with custom dynamic glow shaders and camera navigation paths.
        </p>
        <p>
          Our infrastructure leverages managed PostgreSQL via Supabase with Row Level Security, ensuring strict cryptographic verification of all transactions and preventing sensitive personal credentials from ever reaching the client interface.
        </p>
      </section>

      {/* The Leaderboard & World Leader Feature */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          Community Leaderboard & Contributor Recognition
        </h2>
        <p>
          The platform features a real-time, deterministic leaderboard honoring leading contributors whose generous participation supports the platform&apos;s hosting, rendering infrastructure, and continuous evolution. The highest contributor is highlighted in the World Leader spotlight.
        </p>
        <p>
          Participants may also choose to contribute anonymously at any tier, honoring personal privacy while maintaining their glowing light on Earth.
        </p>
      </section>

      {/* Call to Action */}
      <section className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-[#8993A7] uppercase tracking-wider block mb-1">
            Experience the Monument
          </span>
          <p className="text-sm text-[#F5F7FA]">
            Ready to add your dedication to our shared world?
          </p>
        </div>
        <Link
          href="/"
          className="btn-gold px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center gap-2 shrink-0 shadow-lg"
        >
          <span>VIEW 3D GLOBE</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </LegalPageLayout>
  );
}
