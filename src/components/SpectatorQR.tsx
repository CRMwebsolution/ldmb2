"use client";

import { useId, useRef, useState } from "react";
import { Download, Printer, QrCode, X } from "lucide-react";
import QRCode from "qrcode";
import { buildResultsShareUrls } from "@/lib/results-share";

export function SpectatorQR({
  path,
  eventName,
  className,
}: {
  path: string;
  eventName: string;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [cleanUrl, setCleanUrl] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");

  async function open() {
    const urls = buildResultsShareUrls(window.location.origin, path);
    setCleanUrl(urls.cleanUrl);
    setDisplayText(urls.displayText);
    setImage("");
    setError("");
    dialog.current?.showModal();

    try {
      setImage(await QRCode.toDataURL(urls.trackedUrl, {
        width: 768,
        margin: 4,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#ffffff" },
      }));
    } catch {
      setError("The QR code could not be created. Close this window and try again.");
    }
  }

  function print() {
    const page = window.open("", "_blank", "width=760,height=900");
    if (!page) {
      setError("Allow pop-ups to print the QR code. You can also download the image.");
      return;
    }

    page.opener = null;
    page.document.title = `${eventName} · Race Results QR`;
    page.document.body.style.cssText =
      "font-family:Arial,sans-serif;text-align:center;padding:32px;color:#000;background:#fff";
    const heading = page.document.createElement("h1");
    heading.textContent = eventName;
    const description = page.document.createElement("p");
    description.textContent = "Scan for race results";
    const qr = page.document.createElement("img");
    qr.alt = "QR code for race results";
    qr.style.cssText = "width:100%;max-width:520px;height:auto";
    const address = page.document.createElement("p");
    address.textContent = displayText;
    address.style.cssText = "font-size:20px;font-weight:700;overflow-wrap:anywhere";
    qr.onload = () => {
      page.focus();
      page.print();
    };
    page.document.body.append(heading, description, qr, address);
    qr.src = image;
  }

  const buttonClass = className ||
    "rounded-lg border px-4 py-2 font-bold text-sm inline-flex items-center justify-center gap-2";

  return <>
    <button type="button" onClick={() => void open()} className={buttonClass}>
      <QrCode aria-hidden="true" className="h-4 w-4" />
      Results QR
    </button>

    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="w-[calc(100%-2rem)] max-w-lg rounded-2xl border p-5 shadow-2xl backdrop:bg-black/70"
      style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="text-xl font-black">Race results QR code</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-fg)" }}>{eventName}</p>
        </div>
        <button
          type="button"
          aria-label="Close QR code"
          onClick={() => dialog.current?.close()}
          className="rounded-lg border p-2"
          style={{ borderColor: "var(--border)" }}
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      <div className="my-4 flex min-h-64 items-center justify-center rounded-xl bg-white p-4">
        {image ? <img
          src={image}
          alt={`Scan to view ${eventName} results`}
          width={768}
          height={768}
          className="h-auto w-full max-w-[320px]"
        /> : <p role="status" className="text-slate-900">{error ? "" : "Creating QR code..."}</p>}
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-5 rounded-lg border p-3 text-center" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-fg)" }}>
          Easy-to-type link
        </p>
        <p className="mt-1 break-all font-bold">{displayText}</p>
      </div>

      <p className="mb-4 text-xs" style={{ color: "var(--muted-fg)" }}>
        The QR image uses <code>utm_source=local</code>, <code>utm_medium=screen</code>, and
        <code> utm_campaign=results</code>. The displayed link stays clean.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border px-4 py-3 text-center font-bold"
          style={{ borderColor: "var(--border)" }}
        >
          Open results
        </a>
        {image && <>
          <a
            href={image}
            download="little-doo-race-results-qr.png"
            className="rounded-lg border px-4 py-3 text-center font-bold inline-flex items-center justify-center gap-2"
            style={{ borderColor: "var(--border)" }}
          >
            <Download className="h-4 w-4" /> Download
          </a>
          <button
            type="button"
            onClick={print}
            className="rounded-lg border px-4 py-3 font-bold inline-flex items-center justify-center gap-2 sm:col-span-2"
            style={{ borderColor: "var(--border)" }}
          >
            <Printer className="h-4 w-4" /> Print sign
          </button>
        </>}
      </div>

    </dialog>
  </>;
}
