/**
 * Small motion utilities shared across pages.
 * All of them no-op gracefully under prefers-reduced-motion (the CSS side
 * of the reveal system already forces content visible in that case).
 */

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Adds `.scrolled` to an element once the page scrolls past `threshold`px. */
export function initScrollState(el: Element, threshold = 30): void {
  const update = () => el.classList.toggle("scrolled", window.scrollY > threshold);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

/** Reveals every [data-reveal] element as it enters the viewport. */
export function initReveals(): void {
  const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");
  if (targets.length === 0) return;

  if (reduceMotion() || !("IntersectionObserver" in window)) {
    targets.forEach((t) => t.classList.add("revealed"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );

  targets.forEach((t) => io.observe(t));
}

/**
 * Counts <span data-count="500" data-suffix="+"> up from 0 when it scrolls
 * into view. ~1s, eased, single run.
 */
export function initCountUps(): void {
  const targets = document.querySelectorAll<HTMLElement>("[data-count]");
  if (targets.length === 0) return;

  const finish = (el: HTMLElement) => {
    el.textContent = `${el.dataset.count}${el.dataset.suffix ?? ""}`;
  };

  if (reduceMotion() || !("IntersectionObserver" in window)) {
    targets.forEach(finish);
    return;
  }

  const animate = (el: HTMLElement) => {
    const end = parseFloat(el.dataset.count ?? "0");
    const suffix = el.dataset.suffix ?? "";
    const decimals = (el.dataset.count ?? "").split(".")[1]?.length ?? 0;
    const start = performance.now();
    const dur = 1100;

    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = `${(end * eased).toFixed(decimals)}${suffix}`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          animate(entry.target as HTMLElement);
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.6 }
  );

  targets.forEach((t) => io.observe(t));
}
