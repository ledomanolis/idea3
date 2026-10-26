"use client";

import { useEffect, useState } from "react";

export default function CopyInvite({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState(`/join/${code}`);

  // The full address is only known in the browser.
  useEffect(() => {
    setLink(`${window.location.origin}/join/${code}`);
  }, [code]);

  async function share() {
    // Phones get the native share sheet (WhatsApp, Messages...); desktops copy.
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my group on The Groupchat", url: link });
        return;
      } catch {
        // Cancelled — fall through to copying.
      }
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="invite-box">
      <code>{link}</code>
      <button className="btn primary small" type="button" onClick={share}>
        {copied ? "Copied!" : "Share link"}
      </button>
    </div>
  );
}
