import { css } from "../../lib/css";

/**
 * The promo clip framed as a phone, used twice in the hero: absolutely positioned beside the text on
 * desktop (`hero-promo-desktop`, hidden below the breakpoint in global.css), inline under the CTA on
 * mobile (`hero-promo-mobile`, `compact`). Always plays the portrait (mobile) footage — the frame's own
 * shape is what adapts to the viewport, not the clip inside it.
 */
export function PhoneMockup({ className, compact = false }: { className: string; compact?: boolean }) {
  const frame = compact
    ? `position: relative; width: min(52%, 200px); margin: 8px auto 0; aspect-ratio: 9 / 19.5;`
    : `position: absolute; right: 2%; top: 50%; transform: translateY(-50%); width: clamp(140px, 15vw, 196px); aspect-ratio: 9 / 19.5;`;
  return (
    <div className={className} style={css(`${frame} border-radius: 28px; padding: 8px; background: #262E40; box-shadow: 0 24px 60px -16px rgba(0,0,0,.55);`)}>
      <div style={css(`position: relative; width: 100%; height: 100%; border-radius: 20px; overflow: hidden; background: #0E1219;`)}>
        <video
          className="promo-video"
          style={css(`position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;`)}
          autoPlay
          loop
          muted
          playsInline
          poster="/media/promo/desktop-bg-poster.jpg"
          aria-hidden="true"
        >
          <source src="/media/promo/mobile-bg.webm" type="video/webm" />
          <source src="/media/promo/mobile-bg.mp4" type="video/mp4" />
        </video>
        <img className="promo-video-poster" style={css(`position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;`)} src="/media/promo/desktop-bg-poster.jpg" alt="" />
      </div>
      <div style={css(`position: absolute; left: 50%; top: 9px; transform: translateX(-50%); width: 34%; height: 16px; border-radius: 999px; background: #262E40;`)} />
    </div>
  );
}
