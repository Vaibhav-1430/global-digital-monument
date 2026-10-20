import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { getBusinessInfo } from '@/config/businessInfo';
import {
  FileText,
  Shield,
  AlertTriangle,
  Scale,
  CheckCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service — Global Digital Monument',
  description:
    'Terms of service and user agreement governing access to and use of Global Digital Monument.',
};

export default function TermsPage() {
  const businessInfo = getBusinessInfo();

  return (
    <LegalPageLayout
      title="Terms of Service"
      subtitle="The contractual agreement governing your participation in the Global Digital Monument platform."
      category="Legal Terms & Conditions"
      lastUpdated="October 2026"
    >
      {/* Introduction */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          1. Agreement to Terms
        </h2>
        <p>
          Welcome to Global Digital Monument (&quot;the Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), an individual digital art project operated under the public project name <strong>{businessInfo.operatorName}</strong>. By accessing our website, interacting with the 3D Earth experience, or submitting a contribution to place a virtual light marker, you agree to be bound by these Terms of Service (&quot;Terms&quot;) and our <Link href="/privacy" className="text-[#FFC857] underline">Privacy Policy</Link>.
        </p>
        <p>
          If you do not agree with any portion of these Terms, please refrain from using the Platform or initiating any contributions.
        </p>
      </section>

      {/* 2. Eligibility */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          2. User Eligibility
        </h2>
        <p>
          You must be at least 18 years of age, or the age of legal majority in your country of residence, to authorize financial transactions on this Platform. Individuals under 18 may only use the Platform under the direct supervision of a parent or legal guardian who agrees to be bound by these Terms.
        </p>
      </section>

      {/* 3. Platform Description & Digital Nature */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          3. Nature of the Digital Monument
        </h2>
        <p>
          Global Digital Monument is an interactive, artistic web platform designed to visualize human presence and dedications on a digital 3D model of Earth.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#C3C9D5]">
          <li>
            <strong>Digital Participation Only:</strong> A contribution grants the digital privilege of placing a virtual light marker with an optional tribute message on our interactive globe.
          </li>
          <li>
            <strong>No Physical or Real Property:</strong> Nothing on this Platform conveys real-estate ownership, title, territory, mining rights, or physical property of any kind on Earth.
          </li>
          <li>
            <strong>Individual Project &amp; Non-Profit Disclaimer:</strong> The Platform is operated as an individual project and is not a registered corporate entity, commercial foundation, or charity. Contributions are digital participation fees and are not tax-deductible charitable gifts.
          </li>
        </ul>
      </section>

      {/* 4. Acceptable Use & Prohibited Conduct */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          4. Community Standards & Prohibited Conduct
        </h2>
        <p>
          You agree to use the Platform in a manner that is respectful, lawful, and aligned with our collective community spirit. You expressly agree not to post or transmit dedications, names, or media that:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#C3C9D5]">
          <li>Contain hate speech, incitement to violence, discrimination, or harassment against any group or individual.</li>
          <li>Are defamatory, libellous, fraudulent, obscene, or sexually explicit.</li>
          <li>Disclose private contact details, telephone numbers, or sensitive personal data of third parties without consent.</li>
          <li>Promote illegal goods, unauthorized financial schemes, pyramid schemes, or commercial spam.</li>
          <li>Infringe upon the intellectual property, copyright, or trademark rights of any third party.</li>
        </ul>
        <p className="text-xs sm:text-sm text-[#8993A7]">
          Furthermore, you agree not to engage in web scraping, denial-of-service attacks, automated bot submissions, cryptographic signature forgery, or reverse engineering of the Platform&apos;s APIs. We reserve the absolute right to edit, mask, or permanently remove any marker that violates these rules without prior notice or refund.
        </p>
      </section>

      {/* 5. Payments & Third-Party Processors */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          5. Payment Processing & Fees
        </h2>
        <p>
          Financial contributions on this Platform are processed by licensed third-party payment providers, primarily Razorpay (for Indian Rupee / international transactions). By initiating a transaction:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#C3C9D5]">
          <li>You warrant that you are legally authorized to use the chosen payment method (card, UPI, net banking, or wallet).</li>
          <li>You agree to the payment provider&apos;s applicable terms of service and security requirements.</li>
          <li>You acknowledge that Global Digital Monument does not collect, receive, or store your credit/debit card numbers, CVVs, or banking passwords.</li>
          <li>All contributions are one-time charges. There are no recurring subscription fees.</li>
        </ul>
      </section>

      {/* 6. Intellectual Property */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          6. Intellectual Property Rights
        </h2>
        <p>
          All software code, 3D globe models, custom shaders, UI designs, graphics, audio, brand assets, and trademarks associated with Global Digital Monument are the property of the project operator ({businessInfo.operatorName}) or its licensors.
        </p>
        <p className="text-xs sm:text-sm">
          <strong>License Granted by User:</strong> You retain ownership of your personal dedication text and submitted avatar. However, by submitting content to the monument, you grant us an irrevocable, perpetual, worldwide, royalty-free, transferable license to display, render, reproduce, and archive your dedication and marker as part of the public monument.
        </p>
      </section>

      {/* 7. Service Availability & Maintenance */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          7. Service Availability, Modifications & Uptime
        </h2>
        <p>
          The Platform is provided on an <strong>&quot;AS IS&quot;</strong> and <strong>&quot;AS AVAILABLE&quot;</strong> basis. While we strive to maintain uninterrupted operation, we do not guarantee that the 3D globe, database, or network connections will be uninterrupted, error-free, or compatible with every browser or graphics card.
        </p>
        <p className="text-xs sm:text-sm">
          We reserve the right to perform scheduled maintenance, update 3D assets, modify camera dynamics, or discontinue aspects of the service when operationally necessary.
        </p>
      </section>

      {/* 8. Limitation of Liability */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
          8. Limitation of Liability
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed text-[#8993A7]">
          To the maximum extent permitted by applicable law, in no event shall the project operator ({businessInfo.operatorName}), its developers, or contributors be liable for any indirect, incidental, punitive, special, or consequential damages arising from your access to, use of, or inability to access the Platform. Our total aggregate liability for all claims arising under these Terms shall not exceed the amount actually paid by you to the Platform during the twelve (12) months preceding the claim.
        </p>
      </section>

      {/* 9. Governing Law & Jurisdiction */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
            9. Governing Law & Dispute Resolution
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase">
            Owner Review Required
          </span>
        </div>
        {businessInfo.isJurisdictionConfigured ? (
          <p className="text-xs sm:text-sm">
            These Terms and any dispute or claim arising out of or in connection with them shall be governed by and construed in accordance with the laws of{' '}
            <strong className="text-[#FFC857]">{businessInfo.governingJurisdiction}</strong>, without giving effect to any choice of law or conflict of law principles.
          </p>
        ) : (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm space-y-1.5 text-amber-200/90 leading-relaxed">
            <p>
              <strong>Governing Law Notice:</strong> Global Digital Monument is an individual-operated project. A formal statutory legal jurisdiction has not yet been confirmed by the owner for commercial operations.
            </p>
            <p className="text-[11px] text-amber-300/80">
              Prior to commercial launch, the site owner must confirm the statutory governing jurisdiction under which these Terms and any financial transactions will be legally enforced.
            </p>
          </div>
        )}
        <p className="text-xs sm:text-sm text-[#8993A7]">
          Before initiating any formal dispute, you agree to attempt to resolve any issue informally by contacting the project operator via <Link href="/contact" className="text-[#FFC857] underline">Contact Support</Link>.
        </p>
      </section>

      {/* Navigation footer */}
      <section className="pt-6 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <Link
          href="/privacy"
          className="text-[#8993A7] hover:text-[#FFC857] flex items-center gap-1.5 transition-colors"
        >
          <span>Read our Privacy Policy</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href="/contact"
          className="text-[#8993A7] hover:text-[#FFC857] flex items-center gap-1.5 transition-colors"
        >
          <span>Contact Legal / Support</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </LegalPageLayout>
  );
}
