const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true
});

// =====================================
// CANVAS QUALITY
// =====================================
const DPR = Math.min(window.devicePixelRatio || 1, 2);

canvas.width = window.innerWidth * DPR;
canvas.height = window.innerHeight * DPR;

canvas.style.width = window.innerWidth + "px";
canvas.style.height = window.innerHeight + "px";

ctx.scale(DPR, DPR);

// =====================================
// UI
// =====================================
const scoreUI = document.getElementById("score");
const levelUI = document.getElementById("level");
const heartsUI = document.getElementById("hearts");
const gameOverUI = document.getElementById("game-over");

// =====================================
// GAME STATE
// =====================================
let score = 0;
let hearts = 3;
let level = 1;

const fruits = [];
const effects = [];
const slashTrail = [];
const comboPopups = [];

let screenShake = 0;

// =====================================
// POINTER
// =====================================
const pointer = {

    x: window.innerWidth / 2,
    y: window.innerHeight / 2,

    tx: window.innerWidth / 2,
    ty: window.innerHeight / 2,

    vx: 0,
    vy: 0,

    active: false
};

let gravity = 0.32;

// =====================================
// UTIL
// =====================================
function random(min, max) {

    return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {

    return Math.max(min, Math.min(max, v));
}

// =====================================
// FRUIT
// =====================================
class Fruit {

    constructor() {

        this.radius = random(28, 42);

        this.x =
            random(
                120,
                window.innerWidth - 120
            );

        this.y =
            window.innerHeight + 120;

        this.vx = random(-5, 5);

        this.vy = random(-22, -17);

        this.rotation =
            random(0, Math.PI * 2);

        this.rotationSpeed =
            random(-0.08, 0.08);

        this.type =
            Math.random() < 0.1
                ? "bomb"
                : "fruit";

        this.color =
            this.type === "bomb"
                ? "#222"
                : `hsl(${random(0,360)},100%,55%)`;
    }

    update() {

        this.x += this.vx;
        this.y += this.vy;

        this.vy += gravity;

        this.rotation +=
            this.rotationSpeed;
    }

    draw() {

        ctx.save();

        ctx.translate(this.x, this.y);

        ctx.rotate(this.rotation);

        ctx.shadowColor =
            this.color;

        ctx.shadowBlur = 28;

        // gradient
        const gradient =
            ctx.createRadialGradient(
                -10,
                -10,
                2,
                0,
                0,
                this.radius
            );

        gradient.addColorStop(0, "white");
        gradient.addColorStop(0.15, this.color);
        gradient.addColorStop(1, "black");

        ctx.beginPath();

        ctx.fillStyle =
            gradient;

        ctx.arc(
            0,
            0,
            this.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // shine
        ctx.beginPath();

        ctx.fillStyle =
            "rgba(255,255,255,0.22)";

        ctx.arc(
            -this.radius * 0.35,
            -this.radius * 0.35,
            this.radius * 0.22,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // bomb fuse
        if (this.type === "bomb") {

            ctx.shadowBlur = 0;

            ctx.beginPath();

            ctx.fillStyle =
                "orange";

            ctx.arc(
                12,
                -18,
                5,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }

        ctx.restore();
    }
}

// =====================================
// PARTICLES
// =====================================
class SlashEffect {

    constructor(x, y, color) {

        this.particles = [];

        for (let i = 0; i < 28; i++) {

            this.particles.push({

                x,
                y,

                vx: random(-8, 8),
                vy: random(-8, 8),

                radius:
                    random(2, 5),

                life: 28,

                color
            });
        }
    }

    update() {

        for (const p of this.particles) {

            p.x += p.vx;
            p.y += p.vy;

            p.vy += 0.06;

            p.life--;
        }

        this.particles =
            this.particles.filter(
                p => p.life > 0
            );
    }

    draw() {

        for (const p of this.particles) {

            ctx.globalAlpha =
                p.life / 28;

            ctx.beginPath();

            ctx.fillStyle =
                p.color;

            ctx.arc(
                p.x,
                p.y,
                p.radius,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }
}

// =====================================
// SPAWN
// =====================================
function spawnWave() {

    let amount = 1;

    if (score > 10) amount = 2;
    if (score > 30) amount = 3;
    if (score > 60) amount = 4;
    if (score > 100) amount = 5;
    if (score > 180) amount = 6;

    for (let i = 0; i < amount; i++) {

        fruits.push(
            new Fruit()
        );
    }
}

setInterval(
    spawnWave,
    800
);

// =====================================
// UI
// =====================================
function updateUI() {

    scoreUI.innerText =
        `Score: ${score}`;

    levelUI.innerText =
        `Level: ${level}`;

    heartsUI.innerText =
        "❤️".repeat(hearts);

    level =
        1 + Math.floor(score / 12);

    if (hearts <= 0) {

        gameOverUI.style.display =
            "flex";
    }
}

// =====================================
// ULTIMATE POINTER ENGINE
// =====================================
function updatePointer() {

    const dx =
        pointer.tx - pointer.x;

    const dy =
        pointer.ty - pointer.y;

    const distance =
        Math.hypot(dx, dy);

    let smooth = 0.68;

    if (distance > 200) {

        smooth = 0.95;

    } else if (distance > 120) {

        smooth = 0.88;

    } else if (distance > 70) {

        smooth = 0.80;
    }

    pointer.x += dx * smooth;
    pointer.y += dy * smooth;

    // stabilize
    pointer.x =
        Math.round(pointer.x * 100) / 100;

    pointer.y =
        Math.round(pointer.y * 100) / 100;

    // trail
    if (pointer.active) {

        slashTrail.push({

            x: pointer.x,
            y: pointer.y,

            life: 14
        });

        if (slashTrail.length > 18) {

            slashTrail.shift();
        }
    }

    requestAnimationFrame(
        updatePointer
    );
}

updatePointer();

// =====================================
// COLLISION
// =====================================
function detectCuts() {

    if (!pointer.active)
        return;

    const speed =
        Math.hypot(
            pointer.vx,
            pointer.vy
        );

    if (speed < 0.6)
        return;

    const prevX =
        pointer.x - pointer.vx;

    const prevY =
        pointer.y - pointer.vy;

    let slicedCount = 0;

    for (
        let i = fruits.length - 1;
        i >= 0;
        i--
    ) {

        const fruit =
            fruits[i];

        const x1 = prevX;
        const y1 = prevY;

        const x2 = pointer.x;
        const y2 = pointer.y;

        const cx = fruit.x;
        const cy = fruit.y;

        const dx = x2 - x1;
        const dy = y2 - y1;

        const lengthSq =
            dx * dx + dy * dy;

        let t =
            (
                (cx - x1) * dx +
                (cy - y1) * dy
            ) / lengthSq;

        t = clamp(t, 0, 1);

        const closestX =
            x1 + dx * t;

        const closestY =
            y1 + dy * t;

        const distX =
            cx - closestX;

        const distY =
            cy - closestY;

        const distance =
            Math.hypot(
                distX,
                distY
            );

        let hitRadius =
            fruit.radius + 24;

        // aim assist
        if (
            distance <
            hitRadius + 28
        ) {

            pointer.x +=
                (fruit.x - pointer.x)
                * 0.018;

            pointer.y +=
                (fruit.y - pointer.y)
                * 0.018;
        }

        if (
            distance <
            hitRadius
        ) {

            slicedCount++;

            screenShake = 8;

            effects.push(

                new SlashEffect(

                    fruit.x,
                    fruit.y,
                    fruit.color
                )
            );

            if (
                fruit.type === "bomb"
            ) {

                hearts--;

            } else {

                score++;
            }

            fruits.splice(i, 1);

            updateUI();
        }
    }

    // combo popup
    if (slicedCount >= 2) {

        let text =
            `${slicedCount} COMBO!`;

        if (slicedCount >= 6) {

            text =
                "LEGENDARY!";

        } else if (slicedCount >= 5) {

            text =
                "INSANE!";

        } else if (slicedCount >= 4) {

            text =
                "AWESOME!";
        }

        comboPopups.push({

            text,

            x:
                window.innerWidth / 2,

            y:
                window.innerHeight / 2,

            life: 60,

            scale: 1
        });
    }
}

// =====================================
// RENDER
// =====================================
function render() {

    // cinematic fade
    ctx.fillStyle =
        "rgba(0,0,0,0.16)";

    ctx.fillRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
    );

    ctx.save();

    // shake
    if (screenShake > 0) {

        ctx.translate(

            random(
                -screenShake,
                screenShake
            ),

            random(
                -screenShake,
                screenShake
            )
        );

        screenShake *= 0.88;
    }

    // fruits
    for (
        let i = fruits.length - 1;
        i >= 0;
        i--
    ) {

        const fruit =
            fruits[i];

        fruit.update();

        fruit.draw();

        if (
            fruit.y >
            window.innerHeight + 220
        ) {

            fruits.splice(i, 1);
        }
    }

    // effects
    for (
        let i = effects.length - 1;
        i >= 0;
        i--
    ) {

        const effect =
            effects[i];

        effect.update();

        effect.draw();

        if (
            effect.particles.length === 0
        ) {

            effects.splice(i, 1);
        }
    }

    // combo
    for (
        let i = comboPopups.length - 1;
        i >= 0;
        i--
    ) {

        const p =
            comboPopups[i];

        p.life--;

        p.y -= 1.1;

        p.scale += 0.012;

        ctx.save();

        ctx.globalAlpha =
            p.life / 60;

        ctx.translate(
            p.x,
            p.y
        );

        ctx.scale(
            p.scale,
            p.scale
        );

        ctx.font =
            "bold 74px Arial";

        ctx.textAlign =
            "center";

        ctx.lineWidth = 8;

        ctx.strokeStyle =
            "black";

        ctx.fillStyle =
            "white";

        ctx.strokeText(
            p.text,
            0,
            0
        );

        ctx.fillText(
            p.text,
            0,
            0
        );

        ctx.restore();

        if (p.life <= 0) {

            comboPopups.splice(i, 1);
        }
    }

    // trail
    for (
        let i = 1;
        i < slashTrail.length;
        i++
    ) {

        const prev =
            slashTrail[i - 1];

        const cur =
            slashTrail[i];

        ctx.globalAlpha =
            cur.life / 14;

        // glow
        ctx.strokeStyle =
            "rgba(0,255,255,0.18)";

        ctx.lineWidth = 22;

        ctx.beginPath();

        ctx.moveTo(
            prev.x,
            prev.y
        );

        ctx.lineTo(
            cur.x,
            cur.y
        );

        ctx.stroke();

        // core
        ctx.strokeStyle =
            "rgba(255,255,255,0.95)";

        ctx.lineWidth = 6;

        ctx.beginPath();

        ctx.moveTo(
            prev.x,
            prev.y
        );

        ctx.lineTo(
            cur.x,
            cur.y
        );

        ctx.stroke();

        cur.life--;
    }

    ctx.globalAlpha = 1;

    // cleanup
    for (
        let i = slashTrail.length - 1;
        i >= 0;
        i--
    ) {

        if (
            slashTrail[i].life <= 0
        ) {

            slashTrail.splice(i, 1);
        }
    }

    // pointer
    if (pointer.active) {

        ctx.beginPath();

        ctx.fillStyle =
            "rgba(0,255,255,0.18)";

        ctx.arc(
            pointer.x,
            pointer.y,
            24,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.beginPath();

        ctx.strokeStyle =
            "white";

        ctx.lineWidth = 3;

        ctx.arc(
            pointer.x,
            pointer.y,
            10,
            0,
            Math.PI * 2
        );

        ctx.stroke();

        ctx.beginPath();

        ctx.fillStyle =
            "white";

        ctx.arc(
            pointer.x,
            pointer.y,
            4,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    detectCuts();

    ctx.restore();

    requestAnimationFrame(
        render
    );
}

render();

// =====================================
// HAND TRACKING
// =====================================
const hands =
new Hands({

    locateFile: (file) => {

        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({

    maxNumHands: 1,

    modelComplexity: 0,

    minDetectionConfidence: 0.03,

    minTrackingConfidence: 0.03
});

// =====================================
// ULTIMATE TRACKING SYSTEM
// =====================================
let lostFrames = 0;

let lastRawX =
window.innerWidth / 2;

let lastRawY =
window.innerHeight / 2;

let filteredVX = 0;
let filteredVY = 0;

hands.onResults(results => {

    // =====================================
    // HAND FOUND
    // =====================================
    if (

        results.multiHandLandmarks &&
        results.multiHandLandmarks.length > 0
    ) {

        lostFrames = 0;

        const hand =
            results.multiHandLandmarks[0];

        // landmarks
        const tip =
            hand[8];

        const mid =
            hand[6];

        const palm =
            hand[0];

        // fusion
        const fusionX =
            (
                tip.x * 0.78 +
                mid.x * 0.17 +
                palm.x * 0.05
            );

        const fusionY =
            (
                tip.y * 0.78 +
                mid.y * 0.17 +
                palm.y * 0.05
            );

        // mirror
        const rawX =
            (1 - fusionX) *
            window.innerWidth;

        const rawY =
            fusionY *
            window.innerHeight;

        // raw velocity
        let vx =
            rawX - lastRawX;

        let vy =
            rawY - lastRawY;

        lastRawX = rawX;
        lastRawY = rawY;

        // jitter removal
        const speed =
            Math.hypot(vx, vy);

        if (speed < 1.5) {

            vx = 0;
            vy = 0;
        }

        // blur fix
        if (speed > 120) {

            vx *= 0.55;
            vy *= 0.55;
        }

        // direction lock
        filteredVX =
            filteredVX * 0.45 +
            vx * 0.55;

        filteredVY =
            filteredVY * 0.45 +
            vy * 0.55;

        // clamp
        filteredVX =
            Math.max(
                -80,
                Math.min(80, filteredVX)
            );

        filteredVY =
            Math.max(
                -80,
                Math.min(80, filteredVY)
            );

        // prediction
        let predict = 0.18;

        if (speed > 15)
            predict = 0.35;

        if (speed > 30)
            predict = 0.55;

        if (speed > 50)
            predict = 0.75;

        // target
        pointer.tx =
            rawX +
            filteredVX * predict;

        pointer.ty =
            rawY +
            filteredVY * predict;

        // stabilization
        pointer.tx =
            pointer.tx * 0.88 +
            rawX * 0.12;

        pointer.ty =
            pointer.ty * 0.88 +
            rawY * 0.12;

        // velocity save
        pointer.vx =
            filteredVX;

        pointer.vy =
            filteredVY;

        pointer.active = true;
    }

    // =====================================
    // LOST TRACKING
    // =====================================
    else {

        lostFrames++;

        pointer.tx +=
            pointer.vx * 0.92;

        pointer.ty +=
            pointer.vy * 0.92;

        pointer.vx *= 0.90;
        pointer.vy *= 0.90;

        if (lostFrames > 12) {

            pointer.active = false;
        }
    }
});

// =====================================
// CAMERA
// =====================================
const video =
document.getElementById("video");

const camera =
new Camera(video, {

    onFrame: async () => {

        await hands.send({
            image: video
        });
    },

    width: 1920,
    height: 1080
});

camera.start();