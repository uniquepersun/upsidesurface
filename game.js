const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const mainMenu = document.getElementById("main-menu");
const levelMenu = document.getElementById("level-menu");
const instructionsMenu = document.getElementById("instructions-menu");
const gameOverMenu = document.getElementById("game-over-menu");
const scoreDisplay = document.getElementById("scoreDisplay");
const healthDisplay = document.getElementById("healthDisplay");
const objectiveDisplay = document.getElementById("objectiveDisplay");
const progressBar = document.getElementById("progress-bar");
const messagesUI = document.getElementById("messages");
const finalScore = document.getElementById("final-score");
const hud = document.getElementById("hud");

const levelCompleteMenu = document.getElementById("level-complete-menu");
const levelCompleteTitle = document.getElementById("level-complete-title");
const levelCompleteScore = document.getElementById("level-complete-score");
const levelCompleteBonus = document.getElementById("level-complete-bonus");
document.getElementById("btn-next-level").onclick = () => startGame(currentLevel + 1, true);
document.getElementById("btn-complete-main-menu").onclick = () => {
    levelCompleteMenu.classList.add("hidden");
    mainMenu.classList.remove("hidden");
};

document.getElementById("btn-new-game").onclick = () => startGame(1);
document.getElementById("btn-level-select").onclick = () => {
    mainMenu.classList.add("hidden");
    levelMenu.classList.remove("hidden");
};
document.getElementById("btn-instructions").onclick = () => {
    mainMenu.classList.add("hidden");
    instructionsMenu.classList.remove("hidden");
};
document.getElementById("btn-exit").onclick = () => {
    alert("Exit game not supported in browser.");
};

document.querySelectorAll(".lvl-btn").forEach(btn => {
    btn.onclick = () => startGame(parseInt(btn.dataset.level));
});

document.querySelectorAll(".btn-back").forEach(btn => {
    btn.onclick = () => {
        levelMenu.classList.add("hidden");
        instructionsMenu.classList.add("hidden");
        mainMenu.classList.remove("hidden");
    };
});

document.getElementById("btn-restart").onclick = () => startGame(currentLevel);
document.getElementById("btn-main-menu").onclick = () => {
    gameOverMenu.classList.add("hidden");
    mainMenu.classList.remove("hidden");
};

const assets = {
    audio: {
        shoot: new Audio('./audio/pickup.wav'),
        collect: new Audio('./audio/pickup.wav'),
        hit: new Audio('./audio/hit.wav'),
        water: new Audio('./audio/Bubble.wav')
    },
    img: {
        player: new Image(),
        enemy: new Image(),
        jelly: new Image(),
        rock: new Image(),
        food: new Image(),
        bubble: new Image()
    }
};

assets.img.player.src = './sea-venture/Assets/Art/Player/Submarine.png'; 
assets.img.enemy.src = './sea-venture/Assets/Art/Enemies/Puffer.png'; 
assets.img.jelly.src = './sea-venture/Assets/Art/Enemies/Jellyfish.png';
assets.img.rock.src = './sea-venture/Assets/Art/Environment/Rocks/Rock_1.png'; 
assets.img.food.src = './sprites/Food/Mushroom.png';
assets.img.bubble.src = './sea-venture/Assets/Art/Projectiles/Player Projectile/Bubble.png';

let frameCount = 0;
let score = 0;
let health = 3;
let currentLevel = 1;
let isGameOver = false;
let isLevelComplete = false;
let gameLoopId;

let levelData = {
    1: { type: 'kill', target: 5, text: "Objective: Kill 5 Puffers", curr: 0 },
    2: { type: 'collect', target: 10, text: "Objective: Collect 10 Mushrooms", curr: 0 },
    3: { type: 'survive', target: 45, text: "Objective: Survive 45 seconds", curr: 0 }
};
let currentObj;

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Space: false };
let spacePressed = false;

window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp") keys.ArrowUp = true;
    if (e.code === "ArrowDown") keys.ArrowDown = true;
    if (e.code === "ArrowLeft") keys.ArrowLeft = true;
    if (e.code === "ArrowRight") keys.ArrowRight = true;
    if (e.code === "Space" && !spacePressed) {
        keys.Space = true;
        spacePressed = true;
        shoot();
    }
});
window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowUp") keys.ArrowUp = false;
    if (e.code === "ArrowDown") keys.ArrowDown = false;
    if (e.code === "ArrowLeft") keys.ArrowLeft = false;
    if (e.code === "ArrowRight") keys.ArrowRight = false;
    if (e.code === "Space") {
        keys.Space = false;
        spacePressed = false;
    }
});

let particles = [];

class Player {
    constructor() {
        this.x = 100;
        this.y = 200;

        const sizeMultiplier = 1 + (currentLevel - 1) * 0.25; 
        const speedMultiplier = 1 + (currentLevel - 1) * 0.3; 

        this.w = 64 * sizeMultiplier;
        this.h = 64 * sizeMultiplier;
        this.vx = 0;
        this.vy = 0;
        this.speed = 0.5 * speedMultiplier;
        this.friction = 0.85;
        this.maxSpeed = 6 * speedMultiplier;
        this.bobTime = 0;
    }
    update() {
        if (keys.ArrowUp) this.vy -= this.speed;
        if (keys.ArrowDown) this.vy += this.speed;
        if (keys.ArrowLeft) this.vx -= this.speed;
        if (keys.ArrowRight) this.vx += this.speed;

        this.vx *= this.friction;
        this.vy *= this.friction;

        let speedMag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speedMag > this.maxSpeed) {
            this.vx = (this.vx / speedMag) * this.maxSpeed;
            this.vy = (this.vy / speedMag) * this.maxSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) { this.x = 0; this.vx = 0; }
        if (this.x > canvas.width - this.w) { this.x = canvas.width - this.w; this.vx = 0; }
        if (this.y < 0) { this.y = 0; this.vy = 0; }
        if (this.y > canvas.height - this.h) { this.y = canvas.height - this.h; this.vy = 0; }

        this.bobTime++;
    }
    draw(ctx) {
        let bobOffset = Math.sin(this.bobTime * 0.1) * 3;
        ctx.drawImage(assets.img.player, this.x, this.y + bobOffset, this.w, this.h);
    }
}

class Projectile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 24;
        this.h = 24;
        this.speed = 8;
        this.vy = (Math.random() - 0.5) * 1;
    }
    update() {
        this.x += this.speed;
        this.y += this.vy;
    }
    draw(ctx) {
        ctx.drawImage(assets.img.bubble, this.x, this.y, this.w, this.h);
    }
}

class Enemy {
    constructor(type, speedMult) {
        this.type = type;
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - 100) + 20;

        if (this.type === 'puffer') {
            this.w = 48; this.h = 48;
            this.speed = (Math.random() * 2 + 1.5) * speedMult;
            this.hp = 3;
            this.img = assets.img.enemy;
        } else {
            this.w = 40; this.h = 56;
            this.speed = (Math.random() * 1.5 + 1.0) * speedMult;
            this.hp = 2;
            this.img = assets.img.jelly;
        }
        this.bobTime = Math.random() * 100;
        this.vx = -this.speed;
    }
    update() {
        this.x += this.vx;
        this.bobTime += 0.05;
        this.y += Math.sin(this.bobTime) * (this.type === 'jelly' ? 3 : 1);
    }
    draw(ctx) {
        ctx.drawImage(this.img, this.x, this.y, this.w, this.h);
    }
}

class Food {
    constructor() {
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - 100) + 20;
        this.w = 24; this.h = 24;
        this.speed = 1.5;
    }
    update() { this.x -= this.speed; }
    draw(ctx) {
        ctx.drawImage(assets.img.food, this.x, this.y, this.w, this.h);
    }
}

class Obstacle {
    constructor() {
        this.w = 80; this.h = 80;
        this.x = canvas.width;
        this.y = canvas.height - this.h + 20;
        this.speed = 2;
    }
    update() { this.x -= this.speed; }
    draw(ctx) {
        ctx.drawImage(assets.img.rock, this.x, this.y, this.w, this.h);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
        this.color = color;
        this.r = Math.random() * 4 + 2;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.vy -= 0.1;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

let player, projectiles, enemies, foods, obstacles, bgBubbles;

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

function shoot() {
    if (isGameOver || isLevelComplete) return;
    try {
        assets.audio.shoot.currentTime = 0;
        assets.audio.shoot.play();
    } catch (e) { }
    projectiles.push(new Projectile(player.x + player.w, player.y + player.h / 2 - 12));
    player.vx -= 2; 
}

function takeDamage() {
    health--;
    try {
        assets.audio.hit.currentTime = 0;
        assets.audio.hit.play();
    } catch (e) { }
    spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#ff4757', 15);
    updateHUD();

    player.x -= 30; 

    if (health <= 0) gameOver();
}

function addScore(pts) { score += pts; updateHUD(); }

function checkCollision(r1, r2) {
    let padding = 8; 
    return !(
        r1.x + padding > r2.x + r2.w - padding ||
        r1.x + r1.w - padding < r2.x + padding ||
        r1.y + padding > r2.y + r2.h - padding ||
        r1.y + r1.h - padding < r2.y + padding
    );
}

function updateHUD() {
    scoreDisplay.innerText = "Score: " + score;
    healthDisplay.innerText = "♥️ ".repeat(health);
    objectiveDisplay.innerText = currentObj.text;

    let pct = 0;
    if (currentObj.type === 'survive') {
        pct = (currentObj.curr / (currentObj.target * 60)) * 100;
    } else {
        pct = (currentObj.curr / currentObj.target) * 100;
    }
    progressBar.style.width = Math.min(100, Math.max(0, pct)) + "%";

    if (pct >= 100 && !isGameOver && !isLevelComplete) {
        levelComplete();
    }
}

function showMessage(msg) {
    messagesUI.innerText = msg;
    messagesUI.classList.add('show');
    setTimeout(() => {
        messagesUI.classList.remove('show');
    }, 2000);
}

function startGame(level, keepStats = false) {
    currentLevel = level;
    if (!keepStats) {
        score = 0; health = 3;
    }
    isGameOver = false; isLevelComplete = false; frameCount = 0;

    let nextObj = levelData[currentLevel];
    if (nextObj) {
        currentObj = JSON.parse(JSON.stringify(nextObj));
    } else {

        currentObj = { type: 'kill', target: 10 + currentLevel * 2, text: `Objective: Kill ${10 + currentLevel * 2} Enemies`, curr: 0 };
    }

    player = new Player();
    projectiles = []; enemies = []; foods = []; obstacles = []; particles = []; bgBubbles = [];

    for (let i = 0; i < 30; i++) {
        bgBubbles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 15 + 2,
            speed: Math.random() * 2 + 0.5
        });
    }

    mainMenu.classList.add("hidden");
    levelMenu.classList.add("hidden");
    gameOverMenu.classList.add("hidden");
    levelCompleteMenu.classList.add("hidden");
    hud.classList.remove("hidden");
    updateHUD();
    showMessage(`Level ${currentLevel} Start!`);

    try { assets.audio.water.play(); } catch (e) { }

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoop();
}

function levelComplete() {
    isLevelComplete = true;
    hud.classList.add("hidden");

    let bonus = currentLevel * 1000;
    addScore(bonus);

    levelCompleteMenu.classList.remove("hidden");
    levelCompleteTitle.innerText = `Level ${currentLevel} Complete!`;
    levelCompleteScore.innerText = `Total Score: ${score}`;
    levelCompleteBonus.innerText = `Points +${bonus}`;
}

function gameOver(win = false) {
    isGameOver = true;
    hud.classList.add("hidden");
    gameOverMenu.classList.remove("hidden");
    if (win) {
        gameOverMenu.querySelector('h1').innerText = "You Win!";
        finalScore.innerText = "Final Score: " + score;
    } else {
        gameOverMenu.querySelector('h1').innerText = "Game Over";
        finalScore.innerText = "Score: " + score;
    }
}

function updateObjective(type) {
    if (isGameOver) return;
    if (currentObj.type === type) {
        currentObj.curr++;
        updateHUD();
    }
}

function gameLoop() {
    if (isGameOver) return;
    frameCount++;

    if (!isLevelComplete) {
        if (currentObj.type === 'survive') {
            currentObj.curr++;
            if (frameCount % 60 === 0) updateHUD();
        }

        if (frameCount % Math.max(40, 100 - currentLevel * 15) === 0) {
            let type = Math.random() > 0.5 ? 'puffer' : 'jelly';
            enemies.push(new Enemy(type, 1 + currentLevel * 0.15));
        }
        if (frameCount % 180 === 0) foods.push(new Food());
        if (frameCount % 250 === 0) obstacles.push(new Obstacle());

        player.update();
    } else {

        player.vx *= 0.95;
        player.vy *= 0.95;
        player.x += player.vx;
        player.y += player.vy;
        player.bobTime++;
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update();
        if (projectiles[i].x > canvas.width) projectiles.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    for (let i = bgBubbles.length - 1; i >= 0; i--) {
        let b = bgBubbles[i];
        b.y -= b.speed;
        b.x += Math.sin(b.y * 0.02) * 0.5;
        if (b.y < -20) {
            b.y = canvas.height + 20;
            b.x = Math.random() * canvas.width;
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.update();
        if (e.x < -e.w) { enemies.splice(i, 1); continue; }

        if (!isLevelComplete && checkCollision(player, e)) {
            takeDamage();
            spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#7dcafc', 10);
            enemies.splice(i, 1);
            continue;
        }

        let died = false;
        for (let j = projectiles.length - 1; j >= 0; j--) {
            let p = projectiles[j];
            if (checkCollision(p, e)) {
                spawnParticles(p.x + p.w / 2, p.y + p.h / 2, '#e0f7fa', 5);
                projectiles.splice(j, 1);
                e.hp--;

                ctx.fillStyle = "rgba(255,0,0,0.3)";
                ctx.fillRect(e.x, e.y, e.w, e.h);

                if (e.hp <= 0) {
                    addScore(200);
                    spawnParticles(e.x + e.w / 2, e.y + e.h / 2, e.type === 'puffer' ? '#fbc531' : '#e1b12c', 20);
                    updateObjective('kill');
                    enemies.splice(i, 1);
                    died = true;
                }
                break;
            }
        }
        if (died) continue;
    }

    for (let i = foods.length - 1; i >= 0; i--) {
        foods[i].update();
        if (foods[i].x < -foods[i].w) { foods.splice(i, 1); continue; }
        if (!isLevelComplete && checkCollision(player, foods[i])) {
            try { assets.audio.collect.currentTime = 0; assets.audio.collect.play(); } catch (e) { }
            addScore(50);
            updateObjective('collect');
            spawnParticles(foods[i].x + 12, foods[i].y + 12, '#44bd32', 10);
            foods.splice(i, 1);
        }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        if (obstacles[i].x < -obstacles[i].w) { obstacles.splice(i, 1); continue; }
        if (!isLevelComplete && checkCollision(player, obstacles[i])) {
            takeDamage();
            spawnParticles(obstacles[i].x + 40, obstacles[i].y + 40, '#718093', 15);
            obstacles.splice(i, 1);
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    bgBubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
    });

    obstacles.forEach(o => o.draw(ctx));
    foods.forEach(f => f.draw(ctx));
    enemies.forEach(e => e.draw(ctx));
    player.draw(ctx);
    projectiles.forEach(p => p.draw(ctx));
    particles.forEach(p => p.draw(ctx));

    gameLoopId = requestAnimationFrame(gameLoop);
}

ctx.fillStyle = "#1e88e5";
ctx.fillRect(0, 0, canvas.width, canvas.height);
