/* GSAP enhancement layer. The catalog remains usable if GSAP cannot load. */
window.CatalogMotion = (() => {
  const gsap = window.gsap;
  const noop = () => {};
  if (!gsap) return { init: noop, observe: noop, enter: noop, release: noop,
    modal: noop, drawer: noop, count: (el) => { el.firstChild.textContent = el.dataset.to; } };

  const active = new Map();
  const seen = new WeakSet();
  let enabled = false, mobile = false, observer = null, started = false;
  const mm = gsap.matchMedia();
  function track(tween, targets = []) {
    active.set(tween, gsap.utils.toArray(targets));
    tween.eventCallback('onComplete', () => active.delete(tween));
    tween.eventCallback('onInterrupt', () => active.delete(tween));
    return tween;
  }
  function finish() {
    [...active.keys()].forEach(tween => tween.progress(1));
    active.clear();
  }
  mm.add({ desktop: '(min-width: 801px)', mobile: '(max-width: 800px)',
    reduced: '(prefers-reduced-motion: reduce)' }, context => {
    mobile = context.conditions.mobile;
    enabled = !context.conditions.reduced;
    document.documentElement.classList.add('gsap-ready');
    return finish;
  });

  function enter(targets, options = {}) {
    const nodes = gsap.utils.toArray(targets);
    if (!enabled || document.hidden || !nodes.length) return;
    gsap.killTweensOf(nodes);
    track(gsap.fromTo(nodes, { autoAlpha: 0, y: mobile ? 10 : 18, transition: 'none' }, {
      autoAlpha: 1, y: 0, duration: mobile ? .32 : .48, ease: 'power2.out',
      stagger: { amount: Math.min(mobile ? .12 : .22, (nodes.length - 1) * .045) },
      overwrite: 'auto', clearProps: 'transform,opacity,visibility,transition', ...options
    }), nodes);
  }
  function release(root) {
    if (!root) return;
    // Finish before removing a subtree, restoring styles and final counter values.
    for (const [tween, targets] of [...active]) {
      if (targets.some(node => node === root || root.contains(node))) {
        tween.progress(1);
        tween.kill();
        active.delete(tween);
      }
    }
  }
  function observe() {
    observer?.disconnect();
    if (!('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      const targets = entries.filter(entry => entry.isIntersecting && !seen.has(entry.target))
        .map(entry => entry.target);
      for (const node of targets) {
        seen.add(node);
        observer.unobserve(node);
      }
      // Each newly visible row gets a short stagger; offscreen content stays readable.
      enter(targets);
    }, { threshold: .08, rootMargin: '0px 0px -20px 0px' });
    document.querySelectorAll('.track-card,.catalog-heading,#sections .card').forEach(el => {
      if (!seen.has(el)) observer.observe(el);
    });
  }
  function count(el) {
    const target = Number(el.dataset.to);
    const text = el.firstChild;
    if (!enabled) { text.textContent = target; return; }
    const value = { number: 0 };
    track(gsap.to(value, { number: target, duration: .85, ease: 'power2.out',
      onUpdate: () => { text.textContent = Math.round(value.number); } }), [el]);
  }
  function modal(el) {
    if (!enabled || document.hidden) return;
    gsap.killTweensOf(el);
    track(gsap.fromTo(el, { y: mobile ? 26 : 16, scale: mobile ? 1 : .985 }, {
      y: 0, scale: 1, duration: .3, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform'
    }), [el]);
  }
  function drawer(el) {
    if (!enabled || document.hidden) return;
    release(el);
    track(gsap.fromTo(el, { xPercent: 100 }, {
      xPercent: 0, duration: .3, ease: 'power3.out',
      overwrite: 'auto', clearProps: 'transform'
    }), [el]);
    enter(el.querySelectorAll('nav a'), { duration: .22, stagger: .018 });
  }
  function init() {
    if (started) return;
    started = true;
    if (enabled && window.scrollY < 100) {
      const tl = gsap.timeline({ defaults: { duration: .6, ease: 'power3.out',
        clearProps: 'transform,opacity,visibility,transition' } });
      tl.fromTo('.hero-inner > .stagger:not([hidden])', { autoAlpha: 0, y: mobile ? 12 : 22 },
        { autoAlpha: 1, y: 0, stagger: .075 })
        .fromTo('.hero-board', { autoAlpha: 0, y: mobile ? 14 : 26 },
          { autoAlpha: 1, y: 0 }, .12)
        .fromTo('.hero-product', { autoAlpha: 0, y: 10, transition: 'none' },
          { autoAlpha: 1, y: 0, stagger: .035, duration: .4 }, .28);
      track(tl, document.querySelectorAll('.hero-inner > .stagger,.hero-board,.hero-product'));
    }
    // Keyboard focus must never land on a still-invisible entrance target.
    document.addEventListener('focusin', finish);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) finish();
    });
    observe();
  }
  return { init, observe, enter, release, modal, drawer, count };
})();
