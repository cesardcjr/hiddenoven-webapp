import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { Modal } from "../../components/ui/Modal";
import { TextInput } from "../../components/ui/FormField";
import hiddenOvenLogo from "../../images/hidden-oven-logo.jpg";

const imageModules = import.meta.glob("../../images/*.{jpg,jpeg,png,webp}", { eager: true, import: "default" });

export default function LandingPage() {
  const navigate = useNavigate();
  const images = useMemo(() => Object.values(imageModules).filter((image) => image !== hiddenOvenLogo), []);
  const [active, setActive] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackForm, setTrackForm] = useState({ orderNo: "", customerName: "", contactNumber: "" });

  useEffect(() => {
    if (images.length <= 1) return undefined;
    const interval = window.setInterval(() => setActive((index) => (index + 1) % images.length), 4500);
    return () => window.clearInterval(interval);
  }, [images.length]);

  function moveSlide(delta) { setActive((index) => (index + delta + images.length) % images.length); }
  function handleTouchEnd(event) {
    if (touchStart === null || images.length <= 1) return;
    const delta = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(delta) > 40) moveSlide(delta > 0 ? -1 : 1);
    setTouchStart(null);
  }
  function handleTrackConfirm() {
    const params = new URLSearchParams();
    if (trackForm.orderNo.trim()) params.set("orderNo", trackForm.orderNo.trim());
    else {
      if (!trackForm.customerName.trim() || !trackForm.contactNumber.trim()) return;
      params.set("customerName", trackForm.customerName.trim());
      params.set("contactNumber", trackForm.contactNumber.trim());
    }
    navigate(`/track?${params}`);
  }

  return (
    <CustomerLayout>
      <section className="rounded-[24px] bg-[#F7F4FB] px-4 py-5 text-center sm:px-10 sm:py-9">
        <img src={hiddenOvenLogo} alt="The Hidden Oven" className="mx-auto mb-3 h-20 w-20 rounded-full object-cover shadow-card-md ring-4 ring-white sm:mb-5 sm:h-24 sm:w-24 sm:ring-8" />
        <p className="page-eyebrow">Small-batch bakery</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-5 text-[#6F6B78] sm:mt-4 sm:text-base">Order breads, pastries, and cakes made with care, then choose a convenient pickup schedule.</p>
        <div className="mt-4 flex flex-row justify-center gap-2 sm:mt-6 sm:gap-3"><button className="btn-primary px-5 sm:px-8" onClick={() => navigate("/catalog")}>Place Order Here</button><button className="btn-secondary px-5 sm:px-8" onClick={() => setTrackOpen(true)}>Track an Order</button></div>
      </section>

      <section className="grid gap-2 py-3 sm:grid-cols-3 sm:gap-4 sm:py-7">{[["01", "Pick your favorites", "Explore today’s available breads, pastries, and cakes."], ["02", "Choose your pickup", "Select an available date and time that works for you."], ["03", "Collect and enjoy", "Track your order and pick it up fresh from the oven."]].map(([step, title, copy]) => <article key={step} className="surface-card flex items-center gap-3 p-3 sm:block sm:p-6"><span className="shrink-0 text-2xl font-bold leading-none text-[#462C7D] sm:text-3xl">{step}</span><div><h2 className="text-sm font-bold sm:mt-4 sm:text-lg">{title}</h2><p className="mt-1 hidden text-sm leading-6 text-[#6F6B78] sm:block">{copy}</p></div></article>)}</section>

      <section aria-label="Featured bakery items">
        <div className="relative mx-auto aspect-[16/7] min-h-[170px] max-h-[560px] overflow-hidden rounded-[24px] bg-[#F4F1F8] shadow-card sm:aspect-[16/8] sm:min-h-[260px] sm:rounded-[28px]" onTouchStart={(event) => setTouchStart(event.touches[0].clientX)} onTouchEnd={handleTouchEnd}>
          {images.length ? <img src={images[active]} alt="Featured bakery item" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#6F6B78]">Bakery photos</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          {images.length > 1 && <><button type="button" onClick={() => moveSlide(-1)} aria-label="Previous featured item" className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-[#462C7D] shadow sm:left-4 sm:h-11 sm:w-11 sm:text-2xl">‹</button><button type="button" onClick={() => moveSlide(1)} aria-label="Next featured item" className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-[#462C7D] shadow sm:right-4 sm:h-11 sm:w-11 sm:text-2xl">›</button><div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 sm:bottom-4">{images.map((_, index) => <button key={index} type="button" onClick={() => setActive(index)} aria-label={`Show featured item ${index + 1}`} aria-current={active === index} className={`h-2.5 rounded-full transition-all ${active === index ? "w-7 bg-white" : "w-2.5 bg-white/55"}`} />)}</div></>}
        </div>
      </section>

      <Modal open={trackOpen} onClose={() => setTrackOpen(false)} title="Track your order"><p className="mb-5 text-sm leading-6 text-[#6F6B78]">Use your order number, or enter the customer name and mobile number used at checkout.</p><TextInput label="Order number" value={trackForm.orderNo} onChange={(event) => setTrackForm({ ...trackForm, orderNo: event.target.value })} placeholder="HO-20240101-0001" /><div className="my-4 flex items-center gap-3 text-xs text-[#817C89]"><span className="h-px flex-1 bg-[#E8E6ED]" /><span>or</span><span className="h-px flex-1 bg-[#E8E6ED]" /></div><TextInput label="Full name" value={trackForm.customerName} onChange={(event) => setTrackForm({ ...trackForm, customerName: event.target.value })} placeholder="Juan Dela Cruz" /><TextInput label="Mobile number" value={trackForm.contactNumber} onChange={(event) => setTrackForm({ ...trackForm, contactNumber: event.target.value })} placeholder="09XXXXXXXXX" /><div className="mt-2 flex justify-end gap-3"><button className="btn-secondary" onClick={() => setTrackOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleTrackConfirm}>Track order</button></div></Modal>
    </CustomerLayout>
  );
}
