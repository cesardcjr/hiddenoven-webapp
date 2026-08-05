import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { Modal } from "../../components/ui/Modal";
import { TextInput } from "../../components/ui/FormField";
import hiddenOvenLogo from "../../images/hidden-oven-logo.jpg";

const imageModules = import.meta.glob("../../images/*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
});

export default function LandingPage() {
  const navigate = useNavigate();
  const images = useMemo(() => Object.values(imageModules), []);
  const [active, setActive] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackForm, setTrackForm] = useState({
    orderNo: "",
    customerName: "",
    contactNumber: "",
  });

  useEffect(() => {
    if (images.length <= 1) return undefined;
    const id = window.setInterval(
      () => setActive((idx) => (idx + 1) % images.length),
      2000,
    );
    return () => window.clearInterval(id);
  }, [images.length]);

  function moveSlide(delta) {
    setActive((idx) => (idx + delta + images.length) % images.length);
  }

  function handleTouchEnd(e) {
    if (touchStart === null || images.length <= 1) return;
    const delta = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(delta) > 40) moveSlide(delta > 0 ? -1 : 1);
    setTouchStart(null);
  }

  function handleTrackConfirm() {
    const params = new URLSearchParams();
    if (trackForm.orderNo.trim()) {
      params.set("orderNo", trackForm.orderNo.trim());
    } else {
      if (!trackForm.customerName.trim() || !trackForm.contactNumber.trim())
        return;
      params.set("customerName", trackForm.customerName.trim());
      params.set("contactNumber", trackForm.contactNumber.trim());
    }
    navigate(`/track?${params.toString()}`);
  }

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto">
        <section className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 items-center min-h-[calc(100vh-220px)]">
          <div className="text-center lg:text-left">
            <div
              className="w-32 h-32 md:w-40 md:h-40 rounded-full mx-auto lg:mx-0 mb-5 overflow-hidden"
              style={{
                background: "rgba(201,168,76,0.16)",
                border: "2px solid rgba(201,168,76,0.35)",
                boxShadow: "0 12px 36px rgba(0,0,0,0.35)",
              }}
            >
              <img
                src={hiddenOvenLogo}
                alt="The Hidden Oven logo"
                className="h-full w-full object-cover"
              />
            </div>
            <h1
              className="font-display text-3xl md:text-4xl font-bold mb-3"
              style={{ color: "#E8C96D" }}
            >
              The Hidden Oven
            </h1>
            <p
              className="text-sm md:text-base max-w-md mx-auto lg:mx-0"
              style={{ color: "rgba(240,232,220,0.62)" }}
            >
              Freshly baked breads, pastries, and cakes made for pickup with
              warm, small-batch care.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mt-7">
              <button
                className="btn-primary"
                onClick={() => navigate("/catalog")}
              >
                Start Order Here
              </button>
              <button
                className="btn-secondary"
                onClick={() => setTrackOpen(true)}
              >
                Track Order Here
              </button>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-xl"
            style={{
              background: "#1E1235",
              border: "1px solid rgba(201,168,76,0.18)",
              boxShadow: "0 2px 18px rgba(0,0,0,0.35)",
            }}
            onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
            onTouchEnd={handleTouchEnd}
          >
            <div className="aspect-[16/9]">
              {images.length > 0 ? (
                <img
                  src={images[active]}
                  alt="Featured bakery item"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ color: "#9080A8" }}
                >
                  Bakery photos
                </div>
              )}
            </div>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => moveSlide(-1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full"
                  style={{
                    background: "rgba(13,8,32,0.72)",
                    color: "#E8C96D",
                    border: "1px solid rgba(201,168,76,0.25)",
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => moveSlide(1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full"
                  style={{
                    background: "rgba(13,8,32,0.72)",
                    color: "#E8C96D",
                    border: "1px solid rgba(201,168,76,0.25)",
                  }}
                >
                  ›
                </button>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActive(idx)}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          idx === active
                            ? "#E8C96D"
                            : "rgba(240,232,220,0.35)",
                      }}
                      aria-label={`Show slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={trackOpen}
        onClose={() => setTrackOpen(false)}
        title="Track Order"
      >
        <p className="text-[0.82rem] mb-4" style={{ color: "#9080A8" }}>
          Enter your order number, or use your name and contact number.
        </p>
        <TextInput
          label="Order Number"
          value={trackForm.orderNo}
          onChange={(e) =>
            setTrackForm({ ...trackForm, orderNo: e.target.value })
          }
          placeholder="HO-20240101-0001"
        />
        <div
          className="flex items-center gap-3 my-3"
          style={{ color: "rgba(240,232,220,0.25)" }}
        >
          <div className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.12)" }} />
          <span className="text-[0.72rem] font-medium">or</span>
          <div className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.12)" }} />
        </div>
        <TextInput
          label="Your Name"
          value={trackForm.customerName}
          onChange={(e) =>
            setTrackForm({ ...trackForm, customerName: e.target.value })
          }
          placeholder="Juan Dela Cruz"
        />
        <TextInput
          label="Mobile Number"
          value={trackForm.contactNumber}
          onChange={(e) =>
            setTrackForm({ ...trackForm, contactNumber: e.target.value })
          }
          placeholder="09XXXXXXXXX"
        />
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={() => setTrackOpen(false)}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleTrackConfirm}>
            Confirm
          </button>
        </div>
      </Modal>
    </CustomerLayout>
  );
}
