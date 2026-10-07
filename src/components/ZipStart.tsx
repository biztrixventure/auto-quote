"use client";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

export function ZipStart({ dark = false }: { dark?: boolean }) {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [error, setError] = useState("");
  // Unique per instance: the homepage shows this form twice.
  const id = `zip-start-${useId()}`;

  function start(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a 5-digit ZIP code");
      return;
    }
    router.push(`/quote/vehicle-protection?zip=${zip}`);
  }

  return (
    <form onSubmit={start} noValidate className="w-full max-w-md">
      <label htmlFor={id} className={`label ${dark ? "text-white" : ""}`}>
        Enter your ZIP code to see plans for your area
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="ZIP code"
          value={zip}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
            setError("");
          }}
          className="input flex-1 text-lg"
        />
        <button type="submit" className="btn-primary bg-line text-asphalt hover:bg-[#E3B21F]">
          See my prices
        </button>
      </div>
      {error && <p id={`${id}-error`} className={`error ${dark ? "text-red-300" : ""}`}>{error}</p>}
    </form>
  );
}
