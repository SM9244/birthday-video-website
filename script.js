const birthdayMusic = document.getElementById("birthdayMusic");

// Set birthday music volume, if the audio element exists
if (birthdayMusic) {
  birthdayMusic.volume = 0.5;
}

// Birthday confetti animation
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
