import { Link } from "react-router-dom";
import hiddenOvenLogo from "../../images/hidden-oven-logo.jpg";

export function BrandMark({ to = "/", portal, compact = false, light = false }) {
  const content = (
    <>
      <img src={hiddenOvenLogo} alt="" aria-hidden="true" className={`${compact ? "h-9 w-9" : "h-11 w-11"} rounded-full object-cover ring-2 ring-white/25`} />
      <span className="min-w-0">
        <span className={`block truncate font-bold ${light ? "text-white" : "text-[#462C7D]"}`}>The Hidden Oven</span>
        {portal && <span className={`mt-0.5 block text-[0.64rem] font-semibold uppercase tracking-[0.14em] ${light ? "text-white/65" : "text-[#6F6B78]"}`}>{portal} portal</span>}
      </span>
    </>
  );
  const className = "inline-flex min-w-0 items-center gap-3 no-underline";
  return to ? <Link to={to} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}
