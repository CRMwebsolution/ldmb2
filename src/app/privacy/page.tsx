import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Little Doo Mud Bog handles website information and first-party analytics.",
};

export default function PrivacyPage() {
  return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
    <header className="mb-10">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>Little Doo Mud Bog</p>
      <h1 className="text-4xl font-black mt-2">Privacy Policy</h1>
      <p className="mt-3 text-sm" style={{ color: "var(--muted-fg)" }}>Last updated October 12, 2026</p>
    </header>

    <div className="space-y-8 leading-relaxed">
      <section>
        <h2 className="text-xl font-black mb-2">Information you choose to send</h2>
        <p>When you contact the track or upload a gallery submission, we receive the information you deliberately provide so we can respond or review that submission. Do not send information you do not want the track to receive.</p>
      </section>

      <section>
        <h2 className="text-xl font-black mb-2">First-party website analytics</h2>
        <p>We use an in-house analytics system to understand how the public pages of this website are used and to improve navigation, page layout, and important calls to action. The system may record an anonymous browser-session identifier, page path, site and layout version, device category, viewport and document dimensions, clicks, sampled pointer movement, maximum scroll depth, time spent on major page sections, and probable clicks that did not cause an expected action.</p>
        <p className="mt-3">Position data includes page-relative and normalized coordinates so activity can be shown against the correct desktop, tablet, or mobile layout. This analytics information is stored in the track&apos;s existing database and is available only through the private admin area.</p>
      </section>

      <section>
        <h2 className="text-xl font-black mb-2">What the heatmap system does not collect</h2>
        <p>The heatmap system does not record keystrokes or form-field values. It does not collect names, phone numbers, email addresses, passwords, payment data, uploaded files, private documents, or the contents of contact or chat messages. Tracking is disabled on contact, gallery upload, login, admin, account, booking, checkout, payment, contract, customer, order, rental, and other private or unknown routes. The server rejects heatmap events for those routes even if a browser attempts to send them.</p>
      </section>

      <section>
        <h2 className="text-xl font-black mb-2">Other analytics providers</h2>
        <p>The site also uses Google Analytics and Vercel Analytics for general traffic and performance measurements. Those services operate under their own privacy terms and may receive basic browser, device, and request information.</p>
      </section>

      <section>
        <h2 className="text-xl font-black mb-2">Retention and security</h2>
        <p>Raw first-party behavioral analytics are intended to be retained for up to 120 days unless a shorter operational period is selected. Aggregated, non-identifying summaries may be retained longer to compare site improvements. Access is restricted to the track administrator. No system can guarantee absolute security, but access controls and separate analytics tables are used to keep this data away from race and business records.</p>
      </section>

      <section>
        <h2 className="text-xl font-black mb-2">Your choices</h2>
        <p>The first-party tracker honors supported browser Global Privacy Control and Do Not Track settings. You can also limit analytics through browser privacy controls. No blocking analytics popup is used.</p>
      </section>

      <section>
        <h2 className="text-xl font-black mb-2">Questions</h2>
        <p>Questions about this policy can be sent through the <Link href="/contact" className="font-bold underline" style={{ color: "var(--primary)" }}>contact page</Link>.</p>
      </section>
    </div>
  </div>;
}
