(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const body = document.body;
  const screen = document.getElementById("envelopeScreen");
  const envelope = document.getElementById("envelope");
  const letter = document.getElementById("letter");
  const letterButton = document.getElementById("openLetter");
  const letterLabel = letterButton ? letterButton.querySelector(".btn-label") : null;
  const cakeScene = document.getElementById("cakeScene");
  const cake = document.getElementById("cake");
  const musicButton = document.getElementById("musicToggle");
  const musicLabel = musicButton ? musicButton.querySelector(".music-label") : null;
  const photo = document.getElementById("wifePhoto");
  const wishDone = document.getElementById("wishDone");

  /* ---------- Soft background stars ---------- */

  const starField = document.getElementById("stars");
  const starCount = 72;

  for (let i = 0; i < starCount; i += 1) {
    const star = document.createElement("span");
    const size = 0.8 + Math.random() * 1.6;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.setProperty("--twinkle", `${3 + Math.random() * 5}s`);
    star.style.setProperty("--delay", `${-Math.random() * 8}s`);
    starField.appendChild(star);
  }

  /* ---------- Photo fallback ---------- */

  if (photo) {
    const hidePhoto = () => {
      photo.style.display = "none";
    };

    photo.addEventListener("error", hidePhoto);
    if (photo.complete && photo.naturalWidth === 0) hidePhoto();
  }

  /* ---------- Gentle audio ---------- */

  let audioCtx = null;
  let master = null;
  let chimeBus = null;
  let musicTimer = null;
  let musicStep = 0;
  let isPlaying = false;

  const ensureAudio = () => {
    if (!audioCtx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      audioCtx = new AudioCtor();
      master = audioCtx.createGain();
      master.gain.value = 0;
      master.connect(audioCtx.destination);
      chimeBus = audioCtx.createGain();
      chimeBus.gain.value = 0.9;
      chimeBus.connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  };

  const playNote = (frequency, when, duration, volume, bus = master) => {
    if (!audioCtx) return;

    const tone = audioCtx.createOscillator();
    const shimmer = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const shimmerGain = audioCtx.createGain();

    tone.type = "triangle";
    tone.frequency.value = frequency;
    shimmer.type = "sine";
    shimmer.frequency.value = frequency * 2;

    shimmerGain.gain.value = 0.16;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    tone.connect(gain);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(gain);
    gain.connect(bus);

    tone.start(when);
    shimmer.start(when);
    tone.stop(when + duration + 0.05);
    shimmer.stop(when + duration + 0.05);
  };

  const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  const melody = [0, 2, 4, null, 3, 2, 0, null, 2, 4, 5, 4, 3, 2, null, null];

  const playStep = () => {
    if (!audioCtx) return;
    const now = audioCtx.currentTime + 0.03;
    const note = melody[musicStep % melody.length];

    if (note !== null) playNote(scale[note], now, 1.7, 0.05);
    if (musicStep % 8 === 0) playNote(scale[0] / 2, now, 2.6, 0.028);
    if (musicStep % 8 === 4) playNote(scale[3] / 2, now, 2.3, 0.024);

    musicStep += 1;
  };

  const startMusic = () => {
    if (!ensureAudio()) return;
    isPlaying = true;
    musicStep = 0;
    const now = audioCtx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.linearRampToValueAtTime(0.75, now + 1.4);
    playStep();
    musicTimer = window.setInterval(playStep, 440);
  };

  const stopMusic = () => {
    isPlaying = false;
    window.clearInterval(musicTimer);
    musicTimer = null;
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.0001, now + 0.6);
  };

  const playChime = () => {
    if (!ensureAudio()) return;
    const now = audioCtx.currentTime + 0.02;
    [0, 2, 4, 5].forEach((note, index) => {
      playNote(scale[note], now + index * 0.11, 1.8, 0.045, chimeBus);
    });
  };

  if (musicButton && musicLabel) {
    musicButton.addEventListener("click", () => {
      if (isPlaying) {
        stopMusic();
      } else {
        startMusic();
      }
      musicButton.setAttribute("aria-pressed", String(isPlaying));
      musicLabel.textContent = isPlaying ? "Pause melody" : "Our melody";
    });
  }

  /* ---------- Floating petals ---------- */

  const canvas = document.getElementById("petals");
  const ctx = canvas.getContext("2d");
  const petals = [];
  const petalColors = [
    "rgba(240, 179, 196, 0.9)",
    "rgba(199, 106, 134, 0.8)",
    "rgba(247, 239, 232, 0.72)",
    "rgba(217, 183, 117, 0.72)",
  ];

  let petalsRunning = false;

  const sizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const makePetal = (initial) => ({
    x: Math.random() * window.innerWidth,
    y: initial ? Math.random() * window.innerHeight : -30,
    r: 4.5 + Math.random() * 7,
    vy: 0.28 + Math.random() * 0.55,
    vx: -0.22 + Math.random() * 0.44,
    sway: 0.18 + Math.random() * 0.55,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.006 + Math.random() * 0.012,
    rot: Math.random() * Math.PI * 2,
    vr: -0.008 + Math.random() * 0.016,
    alpha: 0.28 + Math.random() * 0.45,
    color: petalColors[Math.floor(Math.random() * petalColors.length)],
    heart: Math.random() < 0.22,
  });

  const drawPetal = (p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();

    if (p.heart) {
      ctx.moveTo(0, p.r * 0.35);
      ctx.bezierCurveTo(-p.r * 1.15, -p.r * 0.5, -p.r * 0.45, -p.r * 1.2, 0, -p.r * 0.42);
      ctx.bezierCurveTo(p.r * 0.45, -p.r * 1.2, p.r * 1.15, -p.r * 0.5, 0, p.r * 0.35);
    } else {
      ctx.moveTo(0, -p.r);
      ctx.bezierCurveTo(p.r * 0.95, -p.r * 0.45, p.r * 0.72, p.r * 0.7, 0, p.r);
      ctx.bezierCurveTo(-p.r * 0.72, p.r * 0.7, -p.r * 0.95, -p.r * 0.45, 0, -p.r);
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const animatePetals = () => {
    if (!petalsRunning) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    ctx.clearRect(0, 0, width, height);

    petals.forEach((p) => {
      p.phase += p.phaseSpeed;
      p.x += p.vx + Math.sin(p.phase) * p.sway;
      p.y += p.vy;
      p.rot += p.vr;

      if (p.y > height + 40) {
        Object.assign(p, makePetal(false));
        p.y = -40;
      }
      if (p.x < -50) p.x = width + 40;
      if (p.x > width + 50) p.x = -40;

      drawPetal(p);
    });

    window.requestAnimationFrame(animatePetals);
  };

  const startPetals = () => {
    if (reduceMotion || petalsRunning) return;
    sizeCanvas();
    for (let i = 0; i < 26; i += 1) petals.push(makePetal(true));
    petalsRunning = true;
    window.requestAnimationFrame(animatePetals);
  };

  window.addEventListener("resize", () => {
    if (petalsRunning) sizeCanvas();
  });

  /* ---------- Heart bursts ---------- */

  const burstSymbols = ["♥", "♡", "✦", "♥", "♡"];
  const burstColors = ["#f0b3c4", "#efd9a7", "#f7efe8", "#c76a86"];

  const burst = (x, y, count = 18) => {
    if (reduceMotion) return;

    for (let i = 0; i < count; i += 1) {
      const heart = document.createElement("span");
      heart.className = "burst-heart";
      heart.textContent = burstSymbols[Math.floor(Math.random() * burstSymbols.length)];
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
      heart.style.fontSize = `${11 + Math.random() * 15}px`;
      heart.style.color = burstColors[Math.floor(Math.random() * burstColors.length)];
      heart.style.setProperty("--x", `${-170 + Math.random() * 340}px`);
      heart.style.setProperty("--y", `${-230 + Math.random() * 150}px`);
      heart.style.setProperty("--r", `${-70 + Math.random() * 140}deg`);
      heart.style.animationDelay = `${Math.random() * 0.18}s`;
      body.appendChild(heart);
      window.setTimeout(() => heart.remove(), 2100);
    }
  };

  /* ---------- Envelope ---------- */

  let envelopeOpened = false;

  const openEnvelope = () => {
    if (envelopeOpened) return;
    envelopeOpened = true;
    playChime();
    envelope.classList.add("opening");

    window.setTimeout(() => {
      screen.classList.add("hidden");
      screen.setAttribute("aria-hidden", "true");
      screen.inert = true;
      body.classList.add("revealed");
      const title = document.querySelector(".page h1");
      if (title) {
        title.setAttribute("tabindex", "-1");
        title.focus({ preventScroll: true });
      }
      startPetals();
      burst(window.innerWidth / 2, window.innerHeight / 2, 16);
    }, reduceMotion ? 80 : 1350);
  };

  if (envelope && screen) {
    envelope.addEventListener("click", openEnvelope);
    envelope.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openEnvelope();
      }
    });
  }

  /* ---------- Letter ---------- */

  if (letterButton && letter && letterLabel) {
    letterButton.addEventListener("click", () => {
      const isOpen = letter.classList.toggle("open");
      letter.setAttribute("aria-hidden", String(!isOpen));
      letterButton.setAttribute("aria-expanded", String(isOpen));
      letterLabel.textContent = isOpen ? "Close the letter" : "A little message for you";

      if (isOpen) {
        window.setTimeout(() => {
          letter.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "nearest",
          });
        }, 300);
      }
    });
  }

  /* ---------- Birthday wish ---------- */

  let wishMade = false;

  if (cake && cakeScene && wishDone) {
    cake.addEventListener("click", () => {
      if (wishMade) return;
      wishMade = true;
      cakeScene.classList.add("blown");
      cake.setAttribute("aria-label", "Wish made");
      wishDone.textContent = "Wish sent to the stars ✦";

      const rect = cake.getBoundingClientRect();
      burst(rect.left + rect.width / 2, rect.top + rect.height * 0.3, 26);
      playChime();
    });
  }
})();
