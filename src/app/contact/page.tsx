"use client";

import { useState } from "react";
import { AnimateIn } from "@/components/AnimateIn";
import { MapPin, Phone, Clock, ExternalLink, Send } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [sent, setSent] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // In production, wire this up to a real form API (Resend, Formspree, etc.)
    setSent(true);
  }

  const inputStyle = {
    background: "var(--muted)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    borderRadius: "0.75rem",
    padding: "0.625rem 0.875rem",
    width: "100%",
    fontSize: "0.875rem",
    outline: "none",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <AnimateIn>
        <div className="mb-10">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--primary)" }}
          >
            Get In Touch
          </span>
          <h1
            className="text-4xl sm:text-5xl font-black tracking-tight mt-1"
            style={{ color: "var(--foreground)" }}
          >
            Contact
          </h1>
          <p className="mt-2" style={{ color: "var(--muted-fg)" }}>
            Questions, registration inquiries, sponsorships — we&apos;d love to
            hear from you.
          </p>
        </div>
      </AnimateIn>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Contact Info */}
        <AnimateIn direction="left" className="md:col-span-2">
          <div className="space-y-5">
            {[
              {
                icon: <MapPin className="w-5 h-5" />,
                label: "Address",
                value: "759 Tom Mann Rd\nNewport, NC 28570",
                href: "https://maps.google.com/?q=759+Tom+Mann+Rd+Newport+NC",
              },
              {
                icon: <Phone className="w-5 h-5" />,
                label: "Phone",
                value: "(252) 342-0865",
                href: "tel:+12523420865",
              },
              {
                icon: <Clock className="w-5 h-5" />,
                label: "Event Hours",
                value: "Gates: 2:00 PM\nRacing: 4:00 PM",
              },
              {
                icon: <ExternalLink className="w-5 h-5" />,
                label: "Facebook",
                value: "Follow for updates",
                href: "https://facebook.com",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border p-5 flex items-start gap-4"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(180,83,9,0.1)", color: "var(--primary)" }}
                >
                  {item.icon}
                </div>
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: "var(--muted-fg)" }}
                  >
                    {item.label}
                  </p>
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="text-sm font-semibold mt-1 block whitespace-pre-line hover:underline"
                      style={{ color: "var(--foreground)" }}
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p
                      className="text-sm font-semibold mt-1 whitespace-pre-line"
                      style={{ color: "var(--foreground)" }}
                    >
                      {item.value}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AnimateIn>

        {/* Contact Form */}
        <AnimateIn direction="right" className="md:col-span-3">
          <div
            className="rounded-2xl border p-6 sm:p-8"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            {sent ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">✅</div>
                <h3
                  className="text-xl font-black"
                  style={{ color: "var(--foreground)" }}
                >
                  Message sent!
                </h3>
                <p className="text-sm mt-2" style={{ color: "var(--muted-fg)" }}>
                  We&apos;ll get back to you as soon as possible. See you at the
                  bog!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      Name *
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Your name"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      Email *
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="your@email.com"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      Phone
                    </label>
                    <input
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="(optional)"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      Subject
                    </label>
                    <select
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      style={inputStyle}
                    >
                      <option value="">Select a topic</option>
                      <option>General Inquiry</option>
                      <option>Driver Registration</option>
                      <option>Sponsorship</option>
                      <option>Media / Photography</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                    style={{ color: "var(--muted-fg)" }}
                  >
                    Message *
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Tell us what&apos;s on your mind..."
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-100"
                  style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </button>
              </form>
            )}
          </div>
        </AnimateIn>
      </div>

      {/* Map */}
      <AnimateIn delay={0.2}>
        <div
          className="mt-10 rounded-2xl border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          <iframe
            title="Little Doo Mud Bog Map"
            width="100%"
            height="320"
            frameBorder="0"
            style={{ border: 0 }}
            src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU3s_o&q=759+Tom+Mann+Rd+Newport+NC+28570"
            allowFullScreen
          />
        </div>
      </AnimateIn>
    </div>
  );
}
