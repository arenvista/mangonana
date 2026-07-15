/**
 * Scroll-reveal utility.
 *
 * Any element marked with `data-reveal` (optionally `data-reveal="scale|left|right"`)
 * fades/slides into place the first time it crosses the viewport threshold.
 * Siblings sharing a `data-reveal-group` get an automatic stagger via
 * the `--reveal-delay` custom property, driven by their DOM order.
 */

const REVEAL_SELECTOR = "[data-reveal]";
const STAGGER_MS = 90;

export function initScrollReveal(root: ParentNode = document): void {
  const targets = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
  if (targets.length === 0) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  // Auto-stagger elements grouped under the same parent + group key.
  const groups = new Map<string, HTMLElement[]>();
  targets.forEach((el) => {
    const groupKey = el.dataset.revealGroup ?? el.parentElement?.dataset.revealGroup;
    if (!groupKey) return;
    const list = groups.get(groupKey) ?? [];
    list.push(el);
    groups.set(groupKey, list);
  });
  groups.forEach((list) => {
    list.forEach((el, i) => {
      el.style.setProperty("--reveal-delay", `${Math.min(i * STAGGER_MS, 540)}ms`);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

/**
 * Subtle parallax: elements with `data-parallax="0.2"` drift vertically
 * at a fraction of the scroll speed while in view. Disabled under
 * reduced-motion and re-computed with rAF for smoothness.
 */
export function initParallax(root: ParentNode = document): void {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const els = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]"));
  if (prefersReduced || els.length === 0) return;

  let ticking = false;

  const update = () => {
    const viewportH = window.innerHeight;
    for (const el of els) {
      const speed = parseFloat(el.dataset.parallax ?? "0.15");
      const rect = el.getBoundingClientRect();
      const progress = (rect.top + rect.height / 2 - viewportH / 2) / viewportH;
      el.style.transform = `translate3d(0, ${(-progress * speed * 100).toFixed(2)}px, 0)`;
    }
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  };

  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
}

/** Toggles a `.scrolled` class on an element once the page scrolls past `offset`. */
export function initScrollState(el: HTMLElement, offset = 40): void {
  const onScroll = () => {
    el.classList.toggle("scrolled", window.scrollY > offset);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}
