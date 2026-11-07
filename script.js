// ==========================================
// BIRTHDAY MUSIC AND SURPRISE EFFECTS
// ==========================================

const birthdayMusic = document.getElementById("birthdayMusic");
const playMusicBtn = document.getElementById("playMusicBtn");

let surpriseEffectsStarted = false;

// ==========================================
// SET BIRTHDAY MUSIC VOLUME
// ==========================================

if (birthdayMusic) {
  birthdayMusic.volume = 0.5;
}

// ==========================================
// PLAY BIRTHDAY MUSIC
// ==========================================

async function playBirthdayMusic() {
  if (!birthdayMusic) return;

  try {
    await birthdayMusic.play();

    if (playMusicBtn) {
      playMusicBtn.hidden = true;
    }
  } catch (error) {
    console.log("Automatic music playback was blocked by the browser:", error);

    if (playMusicBtn) {
      playMusicBtn.hidden = false;
    }
  }
}

// ==========================================
// FALLING BIRTHDAY EMOJIS AND FLOWERS
// ==========================================

function createConfetti() {
  const emojis = ["🎉", "🎊", "🪻", "🤗", "✨", "🎈", "🥳", "🤍", "🚘", "🎂"];

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement("div");

    // Select a random birthday emoji
    confetti.innerText = emojis[Math.floor(Math.random() * emojis.length)];

    // Set confetti position and appearance
    confetti.style.position = "fixed";
    confetti.style.left = Math.random() * 100 + "vw";
    confetti.style.top = "-40px";

    confetti.style.fontSize = Math.random() * 18 + 16 + "px";

    confetti.style.zIndex = "9999";
    confetti.style.pointerEvents = "none";
    confetti.style.userSelect = "none";

    document.body.appendChild(confetti);

    // Random falling speed
    const duration = Math.random() * 3 + 3;

    // Animate confetti falling down
    const animation = confetti.animate(
      [
        {
          transform: "translateY(0) rotate(0deg)",
          opacity: 1,
        },
        {
          transform: `translateY(110vh) rotate(${Math.random() * 1080}deg)`,
          opacity: 0,
        },
      ],
      {
        duration: duration * 1000,
        easing: "linear",
      }
    );

    // Remove confetti after animation finishes
    animation.onfinish = () => {
      confetti.remove();
    };
  }
}

// ==========================================
// START SURPRISE PAGE EFFECTS AFTER LOGIN
// ==========================================

window.startSurpriseEffects = function () {
  // Prevent duplicate animations
  if (surpriseEffectsStarted) return;

  // Run effects only on surprise.html
  if (document.body.dataset.page !== "surprise") return;

  surpriseEffectsStarted = true;

  console.log("Starting birthday surprise effects!");

  // Start falling birthday emojis
  createConfetti();

  // Attempt to play birthday music
  playBirthdayMusic();
};

// ==========================================
// LISTEN FOR SUCCESSFUL SUPABASE AUTHENTICATION
// ==========================================

document.addEventListener(
  "birthday-authenticated",
  window.startSurpriseEffects
);

// ==========================================
// HANDLE AUTHENTICATION BEFORE SCRIPT LOAD
// ==========================================

if (document.body.dataset.authenticated === "true") {
  window.startSurpriseEffects();
}

// ==========================================
// MANUAL MUSIC BUTTON
// ==========================================

if (playMusicBtn) {
  playMusicBtn.addEventListener("click", () => {
    playBirthdayMusic();
  });
}
