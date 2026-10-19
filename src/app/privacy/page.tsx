import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { getBusinessInfo } from '@/config/businessInfo';
import {
  ShieldCheck,
  Lock,
  Eye,
  Server,
  MapPin,
  Trash2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy — Global Digital Monument',
  description:
    'Our commitment to privacy: what data we collect, how it is used to render 3D lights, and how your payment information is protected.',
};

export default function PrivacyPolicyPage() {
  const businessInfo = getBusinessInfo();

  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="Transparent disclosure of the data we collect, how public dedications are displayed, and how your personal data is protected."
      category="Data Protection & Privacy"
      lastUpdated="October 2026"
    >
      {/* Overview */}
      <section className="space-y-3">
        <p>
          At Global Digital Monument (operated by {businessInfo.legalEntityName}), we believe in transparency, digital dignity, and minimal data collection. This Privacy Policy outlines what information we collect when you visit our website or contribute a light to our shared 3D Earth, how that information is used, and how we protect your personal privacy.
        </p>
      </section>

      {/* 1. What We Collect (Codebase Audit) */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
          <Eye className="w-5 h-5 text-[#7DD3FC]" />
          <span>1. Information We Collect</span>
        </h2>
        <p>
          We only collect data necessary to render your light marker on the 3D globe, calculate leaderboard standings, and verify payment legitimacy:
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
            <h3 className="text-sm font-semibold text-[#F5F7FA]">A. Public Marker Data (Visible on the Globe)</h3>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-[#8993A7]">
              <li>
                <strong>Contributor Name:</strong> The name you choose to display. If you check &quot;Contribute anonymously&quot;, your display name is permanently set to &quot;Anonymous&quot; and your real name is never shown.
              </li>
              <li>
                <strong>Dedication / Message:</strong> Optional dedication text (up to 240 characters) displayed when someone clicks on your light marker.
              </li>
              <li>
                <strong>Optional Avatar / Tribute Image:</strong> If you choose to upload an image, it is displayed as a thumbnail in your dedication card.
              </li>
              <li>
                <strong>Geographic Location & Coordinates:</strong> Latitude and longitude used to position the 3D light beacon on the spherical globe, along with the associated country/region name.
              </li>
              <li>
                <strong>Contribution Amount:</strong> Used to render beacon illumination intensity and calculate community leaderboard ranking.
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
            <h3 className="text-sm font-semibold text-[#F5F7FA]">B. Geolocation Permissions</h3>
            <p className="text-xs sm:text-sm text-[#8993A7] leading-relaxed">
              We offer three ways to choose a location: preset country coordinates, clicking directly on the 3D globe, or using your device&apos;s current location. Device geolocation is requested <strong>ONLY</strong> when you explicitly click the &quot;Current Location&quot; button and grant browser permission. We never track your location in the background or monitor your physical movement.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
            <h3 className="text-sm font-semibold text-[#F5F7FA]">C. Private Payment Verification Records</h3>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-[#8993A7]">
              <li>
                <strong>Transaction References:</strong> Razorpay Order ID (e.g. <code className="text-white font-mono">order_...</code>) and Payment ID (e.g. <code className="text-white font-mono">pay_...</code>) are recorded to prevent duplicate debits, authenticate signatures, and assist with support requests.
              </li>
              <li>
                <strong>Donor Email:</strong> Entered during Razorpay checkout for receipt delivery. This email is stored in an encrypted database column with strict Row Level Security (RLS) and is <em>never exposed</em> in public APIs or client bundles.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 2. What We NEVER Collect or Store */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
          <Lock className="w-5 h-5 text-emerald-400" />
          <span>2. What We NEVER Collect or Store</span>
        </h2>
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2 text-xs sm:text-sm text-emerald-200">
          <p>
            <strong>Zero Financial Credential Storage:</strong> Global Digital Monument does <em>not</em> collect, process, handle, or store:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-emerald-300">
            <li>Credit or debit card numbers</li>
            <li>Card CVV / CVC security codes or card expiration dates</li>
            <li>Net banking passwords or ATM PINs</li>
            <li>UPI PINs or authentication tokens</li>
          </ul>
          <p className="text-[11px] text-emerald-200/80 pt-1">
            All card entry and payment authorizations take place inside Razorpay&apos;s PCI-DSS Level 1 certified checkout environment.
          </p>
        </div>
      </section>

      {/* 3. Third-Party Processors & Infrastructure */}
      <section className="space-y-4 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
          <Server className="w-5 h-5 text-[#FFC857]" />
          <span>3. Third-Party Service Providers</span>
        </h2>
        <p>
          We rely on reputable cloud infrastructure partners to provide this service:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#8993A7]">
          <li>
            <strong>Razorpay:</strong> Payment processing gateway (India / International). Governed by Razorpay&apos;s Privacy Policy.
          </li>
          <li>
            <strong>Supabase:</strong> Managed PostgreSQL cloud database hosting public contributions and encrypted backend records with Row Level Security.
          </li>
          <li>
            <strong>Cloud Hosting Infrastructure:</strong> Application servers serving the Next.js web application and static assets with TLS 1.3 encryption.
          </li>
        </ul>
      </section>

      {/* 4. Cookies & Local Storage */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          4. Cookies and Local Storage
        </h2>
        <p className="text-xs sm:text-sm text-[#8993A7] leading-relaxed">
          We respect your browsing privacy. We do not use third-party advertising cookies, cross-site trackers, or data-broker analytics pixels. We use browser session storage purely to remember whether you have already viewed the opening 3D camera reveal sequence (<code className="text-white font-mono">visited_gdm</code>), ensuring you are not forced to watch the intro animation on every page refresh.
        </p>
      </section>

      {/* 5. Data Retention & Deletion Requests */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight flex items-center gap-2.5">
          <Trash2 className="w-5 h-5 text-[#FFC857]" />
          <span>5. Data Retention & Your Right to Deletion</span>
        </h2>
        <p className="text-xs sm:text-sm text-[#8993A7] leading-relaxed">
          Public light markers remain on the monument indefinitely as part of the collective digital art project. However, you maintain the right to control your personal presence:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#8993A7]">
          <li>
            <strong>Anonymization:</strong> You may request that your displayed name be switched to &quot;Anonymous&quot; at any time.
          </li>
          <li>
            <strong>Marker Removal:</strong> If you wish to delete your light marker and dedication from the globe, you can submit a request via our <Link href="/contact" className="text-[#FFC857] underline">Contact page</Link> referencing your Razorpay Payment ID.
          </li>
        </ul>
      </section>

      {/* 6. Security Limitations & Contact */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          6. Security Practices & Privacy Inquiries
        </h2>
        <p className="text-xs sm:text-sm text-[#8993A7] leading-relaxed">
          We apply robust security measures including cryptographic signature validation (HMAC SHA-256 with constant-time equality checks) and PostgreSQL database Row Level Security. However, no internet transmission or electronic storage method can guarantee 100% absolute invulnerability.
        </p>
        <p className="text-xs sm:text-sm text-[#8993A7] leading-relaxed">
          For any questions or privacy requests regarding your data, please contact our team via <Link href="/contact" className="text-[#FFC857] underline">Contact & Support</Link>.
        </p>
      </section>

      {/* Navigation footer */}
      <section className="pt-6 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <Link
          href="/terms"
          className="text-[#8993A7] hover:text-[#FFC857] flex items-center gap-1.5 transition-colors"
        >
          <span>View Terms of Service</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href="/contact"
          className="text-[#8993A7] hover:text-[#FFC857] flex items-center gap-1.5 transition-colors"
        >
          <span>Privacy Contact & Inquiries</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </LegalPageLayout>
  );
}
