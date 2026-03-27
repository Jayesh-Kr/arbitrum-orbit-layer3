"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

const LOCAL_EXPLORER_URL = "http://localhost:8010";
const configuredExplorerUrl =
  process.env.NEXT_PUBLIC_HUSH_EXPLORER_URL?.trim() || "";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function getExplorerUrl() {
  if (typeof window === "undefined") {
    return configuredExplorerUrl || LOCAL_EXPLORER_URL;
  }

  const currentHost = window.location.hostname;

  if (configuredExplorerUrl) {
    try {
      const configuredUrl = new URL(configuredExplorerUrl);
      if (!isLocalHost(currentHost) && isLocalHost(configuredUrl.hostname)) {
        return "";
      }
    } catch {
      return configuredExplorerUrl.replace(/\/$/, "");
    }
  }

  if (isLocalHost(currentHost)) {
    return LOCAL_EXPLORER_URL;
  }

  return configuredExplorerUrl.replace(/\/$/, "");
}

export default function FaucetPage() {
  const maxClaimAmount = 20;
  const [explorerUrl, setExplorerUrl] = useState(
    configuredExplorerUrl || LOCAL_EXPLORER_URL
  );
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const quickAmounts = ["5", "10", "20"];

  useEffect(() => {
    setExplorerUrl(getExplorerUrl());
  }, []);

  const handleQuickAmount = (val: string) => {
    setAmount(val);
  };

const handleClaim = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setMessage(null);
  
  try {
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, amount }),
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {
      data = { error: 'Invalid response from server' };
    }

    if (res.ok) {
      setMessage(`Success! ${amount} tokens sent to your address.`);
      setAmount("");
      setAddress("");
    } else {
      setMessage(data.error || `Error ${res.status}: ${res.statusText}`);
    }
  } catch (err) {
    setMessage("Network error. Try again.");
  } finally {
    setLoading(false);  // always reset loading
  }
};

  return (
    <main className="min-h-screen overflow-hidden bg-[#080809] text-zinc-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.22),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.2),_transparent_28%),linear-gradient(rgba(34,34,38,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(34,34,38,0.9)_1px,transparent_1px)] bg-[length:auto,auto,48px_48px,48px_48px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="rounded-[28px] border border-zinc-800 bg-zinc-950/75 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-10">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-2 text-xs uppercase tracking-[0.28em] text-zinc-400">
              <Image
                src="/hush-logo.jpeg"
                alt="Hush logo"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
              Hush Networks
            </div>
            <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-zinc-50 sm:text-5xl">
              Fund your next build on Hush Chain.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
              Claim up to {maxClaimAmount} HUSH for contract deployments,
              scripts, and wallet testing on the public Hush developer network.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-zinc-200">
                Network: Hush Chain
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-zinc-200">
                Symbol: HUSH
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-zinc-200">
                Max claim: {maxClaimAmount}
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {explorerUrl ? (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white"
                >
                  Open Hush Chain Explorer
                </a>
              ) : (
                <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/70 px-5 py-3 text-sm font-semibold text-zinc-400">
                  Public explorer not configured yet
                </span>
              )}
              <a
                href="https://hushnetworks.in/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/70 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900"
              >
                Visit Hush Networks
              </a>
            </div>
          </section>

          <section className="rounded-[28px] border border-zinc-800 bg-zinc-50 p-6 text-zinc-950 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                  Hush Faucet
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                  Request tokens
                </h2>
              </div>
              <Image
                src="/hush-logo.jpeg"
                alt="Hush logo"
                width={48}
                height={48}
                className="h-12 w-12 rounded-2xl border border-zinc-200 object-cover"
              />
            </div>
            <form onSubmit={handleClaim} className="flex flex-col gap-4">
              <input
                type="text"
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                placeholder="Enter your wallet address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
              <div className="flex gap-2">
                {quickAmounts.map((val) => (
                  <button
                    type="button"
                    key={val}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-zinc-200 ${
                      amount === val
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-200"
                    }`}
                    onClick={() => handleQuickAmount(val)}
                  >
                    {val} HUSH
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max={maxClaimAmount}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                placeholder={`Number of tokens to claim (max ${maxClaimAmount})`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-zinc-950 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                disabled={loading || !amount || !address}
              >
                {loading ? `Claiming...` : `Claim ${amount || "Tokens"}`}
              </button>
            </form>
            {message && (
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700">
                {message}
              </div>
            )}
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-100 p-4 text-sm text-zinc-600">
              Use the same wallet you plan to deploy with on Hush Chain.
            </div>
          </section>
        </div>

        <a
          href="https://hushnetworks.in/"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex w-full items-center justify-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-6 py-5 text-center transition hover:border-zinc-700 hover:bg-zinc-900/90"
        >
          <span className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            Built on
          </span>
          <span className="h-5 w-px bg-zinc-800" />
          <span className="text-lg font-semibold tracking-[-0.02em] text-zinc-50">
            Hush Chain
          </span>
          <span className="text-zinc-500">→</span>
        </a>
      </div>
    </main>
  );
}
