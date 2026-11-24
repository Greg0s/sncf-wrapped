import { useEffect, useRef, type RefObject } from "react";
import { css } from "../../lib/css";

/**
 * Plays the clip only while it is on screen. When it leaves the viewport it pauses and rewinds, so it is already
 * back on its first frame (the poster) when it returns: the restart is never seen.
 */
function useVisiblePlayback(ref: RefObject<HTMLVideoElement>) {
  useEffect(() => {
    const video = ref.current;
    if (!video || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [ref]);
}

/** The looping, silent demo clip, with its still poster for prefers-reduced-motion (see global.css). */
function PromoClip({ style, name, poster }: { style: string; name: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useVisiblePlayback(ref);
  return (
    <>
      <video ref={ref} className="promo-video" style={css(style)} autoPlay loop muted playsInline preload="auto" poster={poster} aria-hidden="true">
        <source src={`/media/promo/${name}.webm`} type="video/webm" />
        <source src={`/media/promo/${name}.mp4`} type="video/mp4" />
      </video>
      <img className="promo-video-poster" style={css(style)} src={poster} alt="" />
    </>
  );
}

const FILL = "position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;";

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
        <PromoClip style={FILL} name="mobile-bg" poster="/media/promo/desktop-bg-poster.jpg" />
      </div>
    </div>
  );
}

/** Mobile placement: its own card right after the hero, in the same format as the other landing sections. */
export function PromoSection({ className }: { className: string }) {
  return (
    <section
      className={className}
      data-lanim="up"
      style={css(`background: #1B2130; border-radius: 28px; padding: clamp(24px, 4vw, 40px);`)}
    >
      <h2 style={css(`margin: 0 0 6px; font-size: clamp(24px, 3.4vw, 32px); font-weight: 800; letter-spacing: -.035em; line-height: 1.08;`)}>
        Un aperçu de votre wrapped.
      </h2>
      <p style={css(`margin: 0 0 20px; font-size: 15px; color: #AEB7C6;`)}>Avec des trajets fictifs, en quelques secondes.</p>
      <div style={css(`position: relative; width: 100%; aspect-ratio: 4 / 5; border-radius: 20px; overflow: hidden; background: #0E1219;`)}>
        <PromoClip style={FILL} name="crop-45" poster="/media/promo/crop-45-poster.jpg" />
      </div>
    </section>
  );
}
