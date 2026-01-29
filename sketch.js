let video;
let poseNet;
let poses = [];
let pose;
let ready = false;

// Sound control
let badPostureStart = null;
let alertPlayed = false;

// Time tracking
let goodTime = 0;
let badTime = 0;
let lastUpdate = 0;

// Date
let today = new Date().toDateString();

function setup() {
  let canvas = createCanvas(640, 480);
  canvas.parent(document.body);

  // Load saved data
  loadDailyData();

  // Camera
  video = createCapture(VIDEO, () => {
    console.log("Camera ready ✅");
    ready = true;
  });

  video.size(640, 480);
  video.hide();

  // PoseNet
  poseNet = ml5.poseNet(video, modelLoaded);
  poseNet.on("pose", gotPoses);

  lastUpdate = millis();
}

function modelLoaded() {
  console.log("PoseNet loaded ✅");
}

function gotPoses(results) {
  poses = results;

  if (results.length > 0) {
    pose = results[0].pose;
  }
}

function draw() {
  background(0);

  if (ready) {
    image(video, 0, 0, width, height);
  }

  let now = millis();
  let delta = (now - lastUpdate) / 1000; // seconds
  lastUpdate = now;

  if (pose) {

    // Skeleton
    if (poses.length > 0) {
      let skeleton = poses[0].skeleton;

      stroke(0, 255, 0);
      strokeWeight(2);

      for (let i = 0; i < skeleton.length; i++) {
        let a = skeleton[i][0];
        let b = skeleton[i][1];

        line(a.position.x, a.position.y,
             b.position.x, b.position.y);
      }
    }

    // Posture logic
    let shoulderY =
      (pose.leftShoulder.y + pose.rightShoulder.y) / 2;

    let hipY =
      (pose.leftHip.y + pose.rightHip.y) / 2;

    let diff = abs(shoulderY - hipY);

    textAlign(CENTER);
    textSize(20);

    // GOOD posture
    if (diff < 50) {

      fill(0, 255, 0);
      text("Good Posture ✅", width / 2, 30);

      goodTime += delta;

      badPostureStart = null;
      alertPlayed = false;

    }
    // BAD posture
    else {

      fill(255, 0, 0);
      text("Bad Posture ❌", width / 2, 30);

      badTime += delta;

      if (badPostureStart === null) {
        badPostureStart = millis();
      }

      if (millis() - badPostureStart > 3000 && !alertPlayed) {
        playBeep();
        alertPlayed = true;
      }
    }

    showStats();
    saveDailyData();
  }
}

// Show score
function showStats() {

  let total = goodTime + badTime;
  let score = total > 0 ? (goodTime / total) * 100 : 0;

  fill(255);
  textSize(16);

  text(
    "Good: " + Math.floor(goodTime) + "s",
    width / 2,
    height - 60
  );

  text(
    "Bad: " + Math.floor(badTime) + "s",
    width / 2,
    height - 40
  );

  text(
    "Daily Score: " + score.toFixed(1) + "%",
    width / 2,
    height - 20
  );
}

// Save to browser
function saveDailyData() {

  let data = {
    date: today,
    good: goodTime,
    bad: badTime
  };

  localStorage.setItem("postureData", JSON.stringify(data));
}

// Load saved data
function loadDailyData() {

  let data = localStorage.getItem("postureData");

  if (data) {
    let parsed = JSON.parse(data);

    if (parsed.date === today) {
      goodTime = parsed.good;
      badTime = parsed.bad;
    } else {
      goodTime = 0;
      badTime = 0;
    }
  }
}

// Beep
function playBeep() {

  let ctx = new (window.AudioContext ||
                window.webkitAudioContext)();

  let osc = ctx.createOscillator();
  let gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.value = 800;
  osc.start();

  gain.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + 0.5
  );

  osc.stop(ctx.currentTime + 0.5);
}
