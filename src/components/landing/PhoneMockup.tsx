import { useState } from "react";
import { createPortal } from "react-dom";
import { css } from "../../lib/css";

/** Shared video + poster markup (loop, silent, portrait footage), styled by the caller via `style`. */
function PromoClip({ style, variant = "mobile" }: { style: string; variant?: "mobile" | "desktop" }) {
  return (
    <>
      <video className="promo-video" style={css(style)} autoPlay loop muted playsInline poster="/media/promo/desktop-bg-poster.jpg" aria-hidden="true">
        <source src={`/media/promo/${variant}-bg.webm`} type="video/webm" />
        <source src={`/media/promo/${variant}-bg.mp4`} type="video/mp4" />
      </video>
      <img className="promo-video-poster" style={css(style)} src="/media/promo/desktop-bg-poster.jpg" alt="" />
    </>
  );
}

/** Desktop hero placement: the clip framed as a phone, beside the text. */
export function PhoneMockup({ className }: { className: string }) {
  return (
    <div
      className={className}
      style={css(
        `position: absolute; right: 14%; top: 50%; transform: translateY(-50%); width: clamp(150px, 16vw, 208px); aspect-ratio: 9 / 19.5; border-radius: 28px; padding: 8px; background: #262E40; box-shadow: 0 24px 60px -16px rgba(0,0,0,.55);`,
      )}
    >
      <div style={css(`position: relative; width: 100%; height: 100%; border-radius: 20px; overflow: hidden; background: #0E1219;`)}>
        <PromoClip style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;" />
      </div>
      <div style={css(`position: absolute; left: 50%; top: 9px; transform: translateX(-50%); width: 34%; height: 16px; border-radius: 999px; background: #262E40;`)} />
    </div>
  );
}

/** Mobile alternative 1: a short, full-width landscape strip (desktop footage, cropped tight) instead of a tall phone shape. */
export function PromoStrip({ className }: { className: string }) {
  return (
    <div className={className} style={css(`position: relative; width: 100%; margin-top: 10px; aspect-ratio: 2.3 / 1; border-radius: 16px; overflow: hidden; background: #0E1219;`)}>
      <PromoClip variant="desktop" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 30%;" />
    </div>
  );
}

/** Mobile alternative 2: a small tap-to-play row; the clip itself only loads once opened, in a fullscreen overlay. */
export function PromoThumb({ className }: { className: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        style={css(
          `display: flex; align-items: center; gap: 12px; width: 100%; margin-top: 10px; padding: 10px; border-radius: 16px; border: none; background: #262E40; cursor: pointer; text-align: left; font-family: 'Schibsted Grotesk', sans-serif;`,
        )}
      >
        <span style={css(`position: relative; flex: 0 0 auto; width: 56px; height: 56px; border-radius: 12px; overflow: hidden; background: #0E1219;`)}>
          <img src="/media/promo/desktop-bg-poster.jpg" alt="" style={css(`position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;`)} />
          <span style={css(`position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(14,18,25,.4); color: #F1F4F7; font-size: 18px;`)}>
            ▶
          </span>
        </span>
        <span>
          <span style={css(`display: block; font-size: 14px; font-weight: 700;`)}>Voir l'aperçu</span>
          <span style={css(`display: block; font-size: 12px; color: #8A93A6;`)}>11 secondes, sans son</span>
        </span>
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setOpen(false)}
            style={css(`position: fixed; inset: 0; z-index: 50; background: rgba(6,9,14,.88); display: flex; align-items: center; justify-content: center; padding: 24px;`)}
          >
            <div style={css(`position: relative; width: min(88vw, 340px); aspect-ratio: 9 / 19.5; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 60px -16px rgba(0,0,0,.6);`)}>
              <video autoPlay loop muted playsInline controls style={css(`position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;`)}>
                <source src="/media/promo/mobile-bg.webm" type="video/webm" />
                <source src="/media/promo/mobile-bg.mp4" type="video/mp4" />
              </video>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
