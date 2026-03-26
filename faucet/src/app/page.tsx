"use client";
import { useState } from "react";


export default function FaucetPage() {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const quickAmounts = ["5", "10", "20"];

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">Token Faucet</h1>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">Claim tokens to your wallet address.</p>
        <form onSubmit={handleClaim} className="flex flex-col gap-4">
          <input
            type="text"
            className="px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            placeholder="Enter your wallet address"
            value={address}
            onChange={e => setAddress(e.target.value)}
            required
          />
          <div className="flex gap-2 mb-2">
            {quickAmounts.map((val) => (
              <button
                type="button"
                key={val}
                className={`px-4 py-2 rounded-lg border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 ${amount === val ? "bg-foreground text-background dark:bg-zinc-50 dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"}`}
                onClick={() => handleQuickAmount(val)}
              >
                {val}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="1"
            className="px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            placeholder="Number of tokens to claim"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-foreground text-background font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 dark:bg-zinc-50 dark:text-zinc-900 transition-colors disabled:opacity-60"
            disabled={loading || !amount || !address}
          >
            {loading ? `Claiming...` : `Claim ${amount || "Tokens"}`}
          </button>
        </form>
        {message && (
          <div className="mt-4 text-center text-base font-medium text-zinc-700 dark:text-zinc-200">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
