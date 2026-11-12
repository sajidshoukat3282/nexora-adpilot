const SITE = "/";
const EMAIL = "hello@nexoratechnologies.pk";
const linkClass = "text-ink-400 hover:text-ink-200 hover:underline";

export function LegalLinks() {
  return (
    <nav aria-label="Legal" className="mt-6 text-center text-xs text-ink-500">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <a className={linkClass} href={SITE + "pricing.html"} target="_blank" rel="noopener noreferrer">Pricing</a>
        <a className={linkClass} href={SITE + "terms.html"} target="_blank" rel="noopener noreferrer">Terms of Service</a>
        <a className={linkClass} href={SITE + "privacy.html"} target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        <a className={linkClass} href={SITE + "refund.html"} target="_blank" rel="noopener noreferrer">Refund Policy</a>
        <a className={linkClass} href={"mailto:" + EMAIL}>{EMAIL}</a>
      </div>
      <div className="mt-2">&copy; 2026 Nexora Technologies, Lahore, Pakistan</div>
    </nav>
  );
}
