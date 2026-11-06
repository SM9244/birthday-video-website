import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
  getFirstEncodableVideoCodec,
  getFirstEncodableAudioCodec,
} from "mediabunny";

const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;
const FPS = 30;
const TEXT_SCENE_SECONDS = 6;
const PHOTO_SCENE_SECONDS = 4;

let birthdaySite = null;
let birthdayPhotos = [];

// --------------------------------------------------
// 1. LOAD PRIVATE BIRTHDAY PHOTOS
// --------------------------------------------------

async function loadBirthdayPhotos() {
  const gallery = document.getElementById("photoGallery");

  if (!gallery) return;

  gallery.textContent = "Loading your birthday memories... 📸";

  try {
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
      window.location.replace("login.html");
      return;
    }

    const { data: site, error: siteError } = await supabaseClient
      .from("birthday_sites")
      .select("id, recipient_name, birthday_message")
      .eq("recipient_user_id", userData.user.id)
      .limit(1)
      .maybeSingle();

    if (siteError) throw siteError;

    if (!site) {
      gallery.textContent = "No birthday website found for your account.";
      return;
    }

    birthdaySite = site;

    const { data: photos, error: photoError } = await supabaseClient
      .from("birthday_photos")
      .select("id, storage_path")
      .eq("site_id", site.id);

    if (photoError) throw photoError;

    birthdayPhotos = photos || [];
    gallery.innerHTML = "";

    if (birthdayPhotos.length === 0) {
      gallery.textContent = "No photos have been added yet. 🤍";
      return;
    }

    for (const photo of birthdayPhotos) {
      const { data, error } = await supabaseClient.storage
        .from("birthday-photos")
        .createSignedUrl(photo.storage_path, 300);

      if (error) {
        console.error("Photo URL error:", error);
        continue;
      }

      const card = document.createElement("div");
      card.className = "photo-card";

      const image = document.createElement("img");
      image.src = data.signedUrl;
      image.alt = "Private birthday memory";
      image.loading = "lazy";

      card.appendChild(image);
      gallery.appendChild(card);
    }

    if (!gallery.children.length) {
      gallery.textContent = "Photos could not be loaded. Please try again.";
    }
  } catch (error) {
    console.error("Birthday gallery error:", error);
    gallery.textContent = "Unable to load photos. Please try logging in again.";
  }
}

// --------------------------------------------------
// 2. LOAD PRIVATE PHOTOS FOR VIDEO
// --------------------------------------------------

async function getPrivatePhotoImages() {
  const images = [];

  for (const photo of birthdayPhotos) {
    const { data, error } = await supabaseClient.storage
      .from("birthday-photos")
      .createSignedUrl(photo.storage_path, 600);

    if (error) {
      console.error("Could not create photo URL:", error);
      continue;
    }

    const response = await fetch(data.signedUrl);

    if (!response.ok) {
      throw new Error("A birthday photo could not be downloaded.");
    }

    const blob = await response.blob();
    images.push(await createImageBitmap(blob));
  }

  if (images.length === 0) {
    throw new Error("No birthday photos could be loaded for the video.");
  }

  return images;
}

// --------------------------------------------------
// 3. LOAD BACKGROUND
// --------------------------------------------------

async function loadBirthdayBackground() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}birthday-bg.jpg`);

    if (!response.ok) {
      throw new Error("Background image could not be found.");
    }

    return await createImageBitmap(await response.blob());
  } catch (error) {
    console.warn("Background image unavailable:", error);
    return null;
  }
}

// --------------------------------------------------
// 4. LOAD AND LOOP MUSIC
// --------------------------------------------------

async function loadBirthdayMusic(duration) {
  const response = await fetch(`${import.meta.env.BASE_URL}birthday-music.mp3`);

  if (!response.ok) {
    throw new Error("Birthday music could not be loaded.");
  }

  const bytes = await response.arrayBuffer();

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("Your browser does not support audio processing.");
  }

  const audioContext = new AudioContextClass();

  try {
    const original = await audioContext.decodeAudioData(bytes);

    const sampleRate = original.sampleRate;
    const frameCount = Math.ceil(duration * sampleRate);

    const result = audioContext.createBuffer(
      original.numberOfChannels,
      frameCount,
      sampleRate
    );

    for (let channel = 0; channel < original.numberOfChannels; channel++) {
      const source = original.getChannelData(channel);
      const destination = result.getChannelData(channel);

      for (let i = 0; i < frameCount; i++) {
        destination[i] = source[i % source.length];
      }
    }

    return result;
  } finally {
    await audioContext.close();
  }
}

// --------------------------------------------------
// 5. BACKGROUND AND PHOTO DRAWING
// --------------------------------------------------

function drawCoverImage(ctx, image) {
  const scale = Math.max(
    VIDEO_WIDTH / image.width,
    VIDEO_HEIGHT / image.height
  );

  const width = image.width * scale;
  const height = image.height * scale;

  ctx.drawImage(
    image,
    (VIDEO_WIDTH - width) / 2,
    (VIDEO_HEIGHT - height) / 2,
    width,
    height
  );
}

function drawBackground(ctx, backgroundImage) {
  if (backgroundImage) {
    drawCoverImage(ctx, backgroundImage);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

    gradient.addColorStop(0, "#29213c");
    gradient.addColorStop(1, "#654c65");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  }

  ctx.fillStyle = "rgba(0,0,0,0.43)";
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
}

function drawPhoto(ctx, image) {
  const x = 100;
  const y = 115;
  const width = 1080;
  const height = 490;

  // Fit the complete image inside the frame without cropping.
  const scale = Math.min(width / image.width, height / image.height);

  const imageWidth = image.width * scale;
  const imageHeight = image.height * scale;

  const imageX = x + (width - imageWidth) / 2;
  const imageY = y + (height - imageHeight) / 2;

  ctx.save();

  // White photo frame.
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 25;
  ctx.fillStyle = "#ffffff";

  ctx.beginPath();
  ctx.roundRect(x - 8, y - 8, width + 16, height + 16, 20);
  ctx.fill();

  // White background behind the complete photo.
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 14);
  ctx.fill();

  // Draw the entire image without cropping.
  ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);

  ctx.restore();
}

// --------------------------------------------------
// 6. CREATE ALL VIDEO SCENES
// --------------------------------------------------

function createBirthdayScenes() {
  const databaseMessage = birthdaySite?.birthday_message;

  const scenes = [
    {
      type: "text",
      title: "🎂",
      subtitle:
        "A special wish for the one who has always been there for me 🙂",
      body: [
        "Happy Birthday, Superstar! 🎂",
        "My Brother, My Best Friend & Always Your Well-Wisher 🤝",
      ],
    },
    {
      type: "text",
      title: "A Birthday Wish 🤍",
      body: ["Thank you for always being there for me!!!"],
    },
    {
      type: "text",
      title: "Wishing You Happiness ✨",
      body: [
        "May your happiness, peace, and joy grow tenfold with every passing year, and may your life always be filled with countless beautiful moments, endless smiles, and lots of love✨",
      ],
    },
    {
      type: "text",
      title: "Keep Smiling ✨",
      body: [
        "Keep smiling and always stay the way you are✨",
        "I’ll always be there for you, through every step of your journey—to support you, guide you, and cheer for you no matter what. Your happiness and success will always mean a lot to me, and I’ll always wish for the very best for you🤍",
      ],
    },
    {
      type: "text",
      title: "Beautiful Memories 📸",
      body: [
        "Every picture holds a special little story. 🤍",
        "Here are some memories worth keeping forever...",
      ],
    },
  ];

  if (
    databaseMessage &&
    databaseMessage.trim() &&
    databaseMessage.trim() !== "Thank you for always being there for me!!!"
  ) {
    scenes.splice(2, 0, {
      type: "text",
      title: "A Personal Message 🤍",
      body: [databaseMessage.trim()],
    });
  }

  // Each private photo gets its own scene.
  for (let i = 0; i < birthdayPhotos.length; i++) {
    scenes.push({
      type: "photo",
      photoIndex: i,
      title: `Beautiful Memory ${i + 1} 📸`,
    });
  }

  scenes.push(
    {
      type: "text",
      title: "One Last Birthday Gyaan! 🤭",
      body: [
        "Okay, one last birthday gyaan for you!🤭",
        "Don't laugh before clicking... 😜",
      ],
    },
    {
      type: "text",
      title: "A Little Dream, A Big Smile! ❤️",
      body: [
        "🚘",
        "Dear Superstar! 🥹",
        "I know you have your own dreams, plans, and a thousand things going on in your mind. I may tease you, irritate you, but deep down, I always want to see you happy🤗",
      ],
    },
    {
      type: "text",
      title: "BMW or FORTUNER? 😂🚘",
      body: [
        "By the way, I'm still confused... 🧐",
        "When and why did your dream BMW become a FORTUNER? 😂🚘",
        "Anyway, whatever the car is, Dingi's first ride is reserved! 😎🤍",
      ],
    },
    {
      type: "text",
      title: "Always Wishing You the Best ✨",
      body: [
        "No birthday gift can explain how much I wish good things for you. May life give you countless reasons to smile, beautiful surprises, and memories you'll cherish forever. ✨",
      ],
    },
    {
      type: "text",
      title: "Your Dingi Is Always Cheering! 🤍",
      body: [
        "Whatever changes in life, one thing is certain:",
        "You'll always have your Dingi cheering for you!🤍",
      ],
    },
    {
      type: "text",
      title: "Happy Birthday Once Again! 🎂🥳",
      body: [
        "Now hurry up and become rich...",
        "Your passenger is waiting! 😂",
        "From your forever Dingi 😛",
      ],
    },
    {
      type: "text",
      title: "🤗",
      body: ["Made with extra excitement, just for you!🤗"],
    }
  );

  return scenes;
}

// --------------------------------------------------
// 7. DRAW READABLE TEXT WITH AUTOMATIC WRAPPING
// --------------------------------------------------

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;

    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }

  if (line) lines.push(line);

  return lines;
}

function drawTextScene(ctx, scene) {
  const centerX = VIDEO_WIDTH / 2;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Main translucent text panel.
  ctx.fillStyle = "rgba(0,0,0,0.58)";
  ctx.beginPath();
  ctx.roundRect(65, 55, VIDEO_WIDTH - 130, VIDEO_HEIGHT - 110, 28);
  ctx.fill();

  let y = 125;

  // Scene title.
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 8;
  ctx.font = "bold 43px Georgia";

  const titleLines = wrapText(ctx, scene.title || "", 1050);

  for (const line of titleLines) {
    ctx.fillText(line, centerX, y, 1080);
    y += 58;
  }

  // Introductory subtitle, if present.
  if (scene.subtitle) {
    y += 12;
    ctx.font = "italic 24px Georgia";
    ctx.fillStyle = "#ffe6c7";

    const subtitleLines = wrapText(ctx, scene.subtitle, 1030);

    for (const line of subtitleLines) {
      ctx.fillText(line, centerX, y, 1050);
      y += 36;
    }
  }

  y += 28;

  // Fit body text into the available panel space.
  const body = scene.body || [];
  const availableHeight = 590 - y;
  const maxWidth = 990;

  let fontSize = 31;
  let lineHeight = 43;
  let allLines = [];

  while (fontSize >= 20) {
    ctx.font = `${fontSize}px Georgia`;
    allLines = [];

    for (const paragraph of body) {
      const lines = wrapText(ctx, paragraph, maxWidth);

      allLines.push(...lines);
      allLines.push(""); // Paragraph spacing.
    }

    const totalHeight = allLines.length * lineHeight;

    if (totalHeight <= availableHeight) break;

    fontSize -= 2;
    lineHeight -= 2;
  }

  ctx.font = `${fontSize}px Georgia`;
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 5;

  for (const line of allLines) {
    if (line) {
      ctx.fillText(line, centerX, y, maxWidth);
    }

    y += lineHeight;
  }

  ctx.restore();
}

// --------------------------------------------------
// 8. DRAW ONE VIDEO FRAME
// --------------------------------------------------

function drawScene(ctx, scene, backgroundImage, images) {
  drawBackground(ctx, backgroundImage);

  if (scene.type === "photo") {
    const image = images[scene.photoIndex];

    if (image) {
      drawPhoto(ctx, image);
    }

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 625, VIDEO_WIDTH, 95);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 29px Georgia";
    ctx.fillText(scene.title, VIDEO_WIDTH / 2, 672);

    ctx.restore();
  } else {
    drawTextScene(ctx, scene);
  }

  // SM29 Creations watermark
  ctx.save();

  ctx.font = "bold 19px Georgia";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";

  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 5;

  ctx.fillStyle = "rgba(255,255,255,0.9)";

  ctx.fillText("SM29 WebCreations", VIDEO_WIDTH - 35, VIDEO_HEIGHT - 12);

  ctx.restore();
}

// --------------------------------------------------
// 9. GENERATE AND DOWNLOAD MP4
// --------------------------------------------------

async function downloadBirthdayVideo() {
  const button = document.getElementById("downloadVideoBtn");
  const status = document.getElementById("videoStatus");

  if (!button || !status) return;

  if (!birthdaySite || birthdayPhotos.length === 0) {
    status.textContent = "Birthday photos are not ready yet.";
    return;
  }

  if (!("VideoEncoder" in window) || !("AudioEncoder" in window)) {
    status.textContent =
      "MP4 generation is not supported. Please try the latest Chrome or Edge.";
    return;
  }

  button.disabled = true;

  let images = [];
  let backgroundImage = null;
  let output = null;
  let finalized = false;

  try {
    status.textContent = "Loading your private birthday photos... 📸";

    images = await getPrivatePhotoImages();

    status.textContent = "Loading birthday background...";

    backgroundImage = await loadBirthdayBackground();

    const scenes = createBirthdayScenes();

    const sceneDurations = scenes.map((scene) =>
      scene.type === "photo" ? PHOTO_SCENE_SECONDS : TEXT_SCENE_SECONDS
    );

    const totalDuration = sceneDurations.reduce(
      (total, seconds) => total + seconds,
      0
    );

    status.textContent = "Preparing birthday music... 🎵";

    const audioBuffer = await loadBirthdayMusic(totalDuration);

    const canvas = document.createElement("canvas");
    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not create the video canvas.");
    }

    const format = new Mp4OutputFormat();

    const videoCodec = await getFirstEncodableVideoCodec(
      format.getSupportedVideoCodecs(),
      {
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
      }
    );

    const audioCodec = await getFirstEncodableAudioCodec(
      format.getSupportedAudioCodecs()
    );

    if (!videoCodec || !audioCodec) {
      throw new Error(
        "This device does not support the required MP4 encoders."
      );
    }

    output = new Output({
      format,
      target: new BufferTarget(),
    });

    const videoSource = new CanvasSource(canvas, {
      codec: videoCodec,
      quality: new Quality({
        bitrate: 2_500_000,
      }),
    });

    const audioSource = new AudioBufferSource({
      codec: audioCodec,
      quality: new Quality({
        bitrate: 128_000,
      }),
    });

    output.addVideoTrack(videoSource, {
      frameRate: FPS,
    });

    output.addAudioTrack(audioSource);

    output.setMetadataTags({
      title: "Birthday Memories",
      artist: "Birthday Wishes",
    });

    await output.start();

    const totalFrames = Math.ceil(totalDuration * FPS);

    let sceneIndex = 0;
    let sceneStartTime = 0;

    status.textContent = "Creating your complete birthday video... 🎬";

    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / FPS;

      // Find which scene belongs to this frame.
      while (
        sceneIndex < scenes.length - 1 &&
        time >= sceneStartTime + sceneDurations[sceneIndex]
      ) {
        sceneStartTime += sceneDurations[sceneIndex];
        sceneIndex++;
      }

      const scene = scenes[sceneIndex];

      drawScene(ctx, scene, backgroundImage, images);

      await videoSource.add(time, 1 / FPS);

      if (frame % 30 === 0) {
        const percentage = Math.round(((frame + 1) / totalFrames) * 100);

        status.textContent = `Creating your birthday video... ${percentage}%`;

        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    await videoSource.close();

    await audioSource.add(audioBuffer);
    await audioSource.close();

    status.textContent = "Finishing your MP4 video...";

    await output.finalize();
    finalized = true;

    const videoBuffer = output.target.buffer;

    if (!videoBuffer) {
      throw new Error("The MP4 file could not be created.");
    }

    const videoBlob = new Blob([videoBuffer], { type: "video/mp4" });

    const downloadUrl = URL.createObjectURL(videoBlob);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "Complete-Birthday-Memories.mp4";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);

    status.textContent =
      "Your complete birthday video is ready! Enjoy your memories! 🎉";
  } catch (error) {
    console.error("Birthday video error:", error);

    status.textContent =
      error.message || "Unable to create the birthday video.";

    if (output && !finalized) {
      try {
        await output.cancel();
      } catch (cancelError) {
        console.error("Video cleanup error:", cancelError);
      }
    }
  } finally {
    images.forEach((image) => image.close());

    if (backgroundImage) {
      backgroundImage.close();
    }

    button.disabled = false;
  }
}

// --------------------------------------------------
// 10. CONNECT DOWNLOAD BUTTON
// --------------------------------------------------

const downloadButton = document.getElementById("downloadVideoBtn");

if (downloadButton) {
  downloadButton.addEventListener("click", downloadBirthdayVideo);
}

// Load private birthday photos.
loadBirthdayPhotos();
