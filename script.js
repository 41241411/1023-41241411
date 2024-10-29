const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

const themes = {
    default: "#ffffff", // 预设背景颜色
    "night-sky": "img/night-sky.jpg", // 夜空背景
    forest: "img/forest.jpg" // 森林背景
};

let currentTheme = "default";
let backgroundImage = new Image();
backgroundImage.src = themes[currentTheme];

// 监听下拉菜单的变化
document.getElementById("backgroundTheme").addEventListener("change", (event) => {
    currentTheme = event.target.value;

    // 根据选择的主题设置背景
    if (currentTheme === "default") {
        backgroundImage = null; // 不使用图片
    } else {
        backgroundImage.src = themes[currentTheme]; // 设置为对应的背景图片
    }
});

// 绘制背景的函数
function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (currentTheme === "default") {
        ctx.fillStyle = themes.default; // 预设颜色
        ctx.fillRect(0, 0, canvas.width, canvas.height); // 填充背景颜色
    } else if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height); // 绘制背景图
    }
}

// 获取音频元素
const backgroundMusic = document.getElementById("backgroundMusic");
const hitSound = document.getElementById("hitSound");
const jump = document.getElementById("jump");

let ballRadius = 10;
let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 1; // 水平速度
let dy = -1; // 垂直速度

const paddleHeight = 10;
let paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;

let rightPressed = false;
let leftPressed = false;

let ballLaunched = false;

let brickRowCount = 5; // 使用 let
let brickColumnCount = 5; // 使用 let

const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = 30;

let hiddenBricks = []; // 新增一個隱藏磚塊的數組
let bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
        const isHidden = Math.random() > 0.5; // 隨機設置磚塊是否為隱藏狀態
        bricks[c][r] = { x: 0, y: 0, status: isHidden ? 0 : 1, visible: !isHidden };
    }
}
let difficulty; // 宣告 difficulty 為全局變數

let paddleY = canvas.height - paddleHeight; // 初始化桿子Y坐标
let isJumping = false; // 跳跃状态
let isCoolingDown = false; // 是否处于冷却状态
let cooldownDuration = 3; // 冷却时间，单位为秒
let remainingCooldown = 0; // 剩余冷却时间
let jumpHeight = 40; // 跳跃高度
const jumpSpeed = 1; // 跳跃速度
let jumpY = 0; // 当前跳跃偏移量

let score = 0; // 移动到此处，避免重复声明
let comboCount = 0; // 当前连击次数
let comboThreshold = 3; // 连击阈值
let comboScoreMultiplier = 1; // 连击加分倍数
let lives = 3; // 生命值

let powerUps = []; // 存储道具的数组

let powerUpStatus = ""; // 存儲道具狀態
let powerUpRemaining = 0; // 剩餘時間
let powerUpActive = false; // 跟蹤道具是否有效

function createPowerUp(x, y, type) {
    const powerUp = new PowerUp(type, x, y); // 确保使用 PowerUp 类创建实例
    powerUps.push(powerUp);
}

let timeChallengeMode = false; // 用於跟踪是否進入時間挑戰模式
let timeLimit; // 限定時間
let remainingTime; // 剩餘時間

const explosionGif = new Image();
explosionGif.src = "img/explosions.gif"; // 替换为GIF的路径
let explosions = [];

function keyDownHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = true;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = true;
    }
}

document.getElementById("timeChallengeButton").addEventListener("click", () => {
    if (timeChallengeMode) {
        // 如果已经在时间挑战模式，取消它
        timeChallengeMode = false;
        const messageDiv = document.createElement("div");
        messageDiv.textContent = "已取消時間挑戰模式";
        messageDiv.style.position = "fixed";
        messageDiv.style.top = "20px";
        messageDiv.style.left = "50%";
        messageDiv.style.transform = "translateX(-50%)";
        messageDiv.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        messageDiv.style.color = "white";
        messageDiv.style.padding = "10px";
        messageDiv.style.borderRadius = "5px";
        messageDiv.style.zIndex = "1000";

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 3000);
    } else {
        // 否则启用时间挑战模式
        timeChallengeMode = true;
        startTimeChallenge(); // 启动计时器

        const messageDiv = document.createElement("div");
        messageDiv.textContent = "已選擇時間挑戰模式";
        messageDiv.style.position = "fixed";
        messageDiv.style.top = "20px";
        messageDiv.style.left = "50%";
        messageDiv.style.transform = "translateX(-50%)";
        messageDiv.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        messageDiv.style.color = "white";
        messageDiv.style.padding = "10px";
        messageDiv.style.borderRadius = "5px";
        messageDiv.style.zIndex = "1000";

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 3000);
    }
});

function startTimeChallenge() {
    difficulty = document.getElementById("difficulty").value; // 使用選擇的難度

    // 根據難度設置時間限制
    switch (difficulty) {
        case "easy":
            timeLimit = 60; // 60秒
            break;
        case "medium":
            timeLimit = 45; // 45秒
            break;
        case "hard":
            timeLimit = 30; // 30秒
            break;
    }
    remainingTime = timeLimit; // 初始化剩餘時間
}

// 更新球的逻辑
function collisionDetection() {
    console.log("Collision detection called");
    let allBricksCleared = true;
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                allBricksCleared = false;
                if (
                    x > b.x &&
                    x < b.x + brickWidth &&
                    y > b.y &&
                    y < b.y + brickHeight
                ) {
                    dy = -dy; // 反弹逻辑
                    hitSound.play();
                    // 每次碰撞都增加连击计数
                    comboCount++;
                    explosions.push(
                        new Explosion(b.x + brickWidth / 2, b.y + brickHeight / 2)
                    ); // 添加爆炸效果
                    // 连击处理
                    let additionalScore = 1; // 默认加分
                    if (comboCount > 3) {
                        additionalScore = 2; // 连击超过3次的加分
                    }
                    score += additionalScore; // 更新分数
                    if (b.opacity === 0) {
                        b.opacity = 1; // 设置为可见
                        b.color = getColor(b.hitsRequired);
                    } else {
                        b.hitsRequired--;
                        b.color = getColor(b.hitsRequired);
                        if (b.hitsRequired <= 0) {
                            b.status = 0; // 砖块被击破

                            // 随机掉落道具
                            if (Math.random() < 0.1) {
                                const powerUpType = Math.random() < 0.5 ? "expand" : "speedUp";
                                createPowerUp(
                                    b.x + brickWidth / 2,
                                    b.y + brickHeight / 2,
                                    powerUpType
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    if (allBricksCleared) {
        gameOver("恭喜！你赢了！分数: " + score);
    }
}

function updateBall() {
    // 更新球的位置
    x += dx;
    y += dy;

    // 检查与桿子的碰撞
    if (
        y + ballRadius >= paddleY &&
        y + ballRadius <= paddleY + paddleHeight &&
        x > paddleX &&
        x < paddleX + paddleWidth
    ) {
        dy = -Math.abs(dy); // 让球向上反弹
        y = paddleY - ballRadius; // 确保球在桿子上方，避免卡住
        comboCount = 0; // 碰到桿子时重置连击计数
    }

    // 处理边界检测
    if (x + ballRadius > canvas.width || x - ballRadius < 0) {
        dx = -dx; // 碰到左右边界反弹
    }
    if (y - ballRadius < 0) {
        dy = -dy; // 碰到上边界反弹
    }

    // 检查球是否落到最底部
    if (y + ballRadius > canvas.height) {
        comboCount = 0;
        lives--; // 减少生命
        resetBall(); // 重置球的位置
        resetPaddle(); // 重置桿子的位置
        ballLaunched = false; // 重置发射状态
        draw();

        // 检查是否还有生命
        if (lives <= 0) {
            gameOver("遊戲结束！分数: " + score);
        }
    }
}

function handleJump() {
    if (isJumping) {
        if (jumpY > 0) {
            paddleY -= jumpSpeed; // 桿子上升
            jump.play(); // 播放背景音乐
            jumpY -= jumpSpeed; // 减少跳跃偏移
        } else {
            paddleY += jumpSpeed; // 桿子下落

            if (paddleY >= canvas.height - paddleHeight) {
                paddleY = canvas.height - paddleHeight; // 确保桿子回到原位
                isJumping = false; // 完成跳跃
                jump.pause(); // 播放背景音乐
                jump.currentTime = 0; // 重置音效位置
            }
        }
    }
}

// 启动冷却计时器并动态更新冷却时间
function startCooldown() {
    isCoolingDown = true;
    remainingCooldown = cooldownDuration;

    const cooldownInterval = setInterval(() => {
        remainingCooldown -= 0.1; // 每100ms减少冷却时间0.1秒
        updateCooldownDisplay();

        if (remainingCooldown <= 0) {
            clearInterval(cooldownInterval);
            isCoolingDown = false;
            remainingCooldown = 0;
            updateCooldownDisplay(); // 冷却结束，隐藏显示
        }
    }, 100); // 每100ms更新一次
}

// 冷却时间显示更新函数
function updateCooldownDisplay() {
    const cooldownDisplay = document.getElementById("cooldownDisplay");
    if (remainingCooldown > 0) {
        cooldownDisplay.style.visibility = "visible";
        cooldownDisplay.textContent = `冷却中：${remainingCooldown.toFixed(1)} 秒`;
    } else {
        cooldownDisplay.style.visibility = "hidden";
    }
}

// 更新球的速度的函数
function resetBall() {
    x = canvas.width / 2;
    y = canvas.height - paddleHeight - ballRadius; // 确保球在桿子上方
    switch (difficulty) {
        case "easy":
            dx = 1;
            dy = -1;
            break;
        case "medium":
            dx = 3;
            dy = -3;
            break;
        case "hard":
            dx = 5;
            dy = -5;
            break;
    }
}

function resetPaddle() {
    paddleX = (canvas.width - paddleWidth) / 2; // 重新设置桿子位置到初始位置
    paddleY = canvas.height - paddleHeight; // 确保桿子回到底部
}

// 绘制桿子
function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, paddleY, paddleWidth, paddleHeight);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}

document.getElementById("startButton").addEventListener("click", startGame);
canvas.addEventListener("mousemove", mouseMoveHandler);
canvas.addEventListener("mousedown", mouseDownHandler);
document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);

let selectedDifficulty; // 新增变量以储存选择的难度
function startGame() {
    difficulty = document.getElementById("difficulty").value; // 设置 difficulty

    // 根据难度设置游戏参数
    switch (difficulty) {
        case "easy":
            brickRowCount = 3;
            brickColumnCount = 11;
            break;
        case "medium":
            brickRowCount = 5;
            brickColumnCount = 11;
            break;
        case "hard":
            brickRowCount = 7;
            brickColumnCount = 11;
            break;
    }

    // 清空砖块并重新生成
    resetBricks();

    if (timeChallengeMode) {
        // 这里可以添加时间挑战模式的逻辑，比如设置计时器
        startTimeChallenge(); // 假设你有一个函数来处理计时
    }

    document.getElementById("startScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "block";

    resetBall(); // 重置球的位置
    ballLaunched = false; // 设置球为未发射状态
    backgroundMusic.play(); // 播放背景音乐
    draw(); // 绘制初始画面
}

// 在resetBricks函數中初始化隱藏磚塊
function resetBricks() {
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            let hitsRequired;
            const random = Math.random();

            if (difficulty === "easy") {
                hitsRequired = 1; // 确保简单难度时为 1
                bricks[c][r] = {
                    x: 0,
                    y: 0,
                    status: 1,
                    hitsRequired: hitsRequired,
                    color: "#0095DD", // 确保颜色为蓝色
                    opacity: 1, // 完全可见
                };
            } else if (difficulty === "medium") {
                hitsRequired = random < 0.6 ? 1 : 2;
                bricks[c][r] = {
                    x: 0,
                    y: 0,
                    status: 1,
                    hitsRequired: hitsRequired,
                    color: getColor(hitsRequired),
                    opacity: random < 0.2 ? 0 : 1, // 20% 概率设置为透明
                };
            } else {
                // 困难难度
                hitsRequired = random < 0.2 ? 3 : 2; // 大部分为 2，少量为 3
                bricks[c][r] = {
                    x: 0,
                    y: 0,
                    status: 1,
                    hitsRequired: hitsRequired,
                    color: getColor(hitsRequired),
                    opacity: random < 0.2 ? 0 : 1, // 20% 概率设置为透明
                };
            }
        }
    }
}

function generatePowerUp(x) {
    const types = ["expand", "speedUp"];
    const type = types[Math.floor(Math.random() * types.length)];
    const powerUp = new PowerUp(type, x, 0);
    console.log(powerUp); // 调试信息
    powerUps.push(powerUp);
}

function mouseMoveHandler(e) {
    const relativeX = e.clientX - canvas.offsetLeft;
    // 限制桿子的移动范围
    if (
        relativeX > paddleWidth / 2 &&
        relativeX < canvas.width - paddleWidth / 2
    ) {
        paddleX = relativeX - paddleWidth / 2;
        if (!ballLaunched) {
            x = paddleX + paddleWidth / 2; // 更新球的位置以跟随桿子
            y = canvas.height - paddleHeight - ballRadius; // 使球在桿子上方
        }
    } else if (relativeX <= paddleWidth / 2) {
        paddleX = 0; // 如果鼠标位置过左，桿子设置为最左边
    } else {
        paddleX = canvas.width - paddleWidth; // 如果鼠标位置过右，桿子设置为最右边
    }
}

function mouseDownHandler(e) {
    // 检查右键（button 为 2 表示右键）
    if (e.button === 2 && !isJumping && !isCoolingDown) {
        isJumping = true;
        jumpY = jumpHeight; // 开始跳跃
        startCooldown(); // 启动冷却计时器
    }

    // 如果球未发射且生命值大于0，按左键可以发射球（button 为 0 表示左键）
    if (e.button === 0 && !ballLaunched && lives > 0) {
        ballLaunched = true;
    }
}

function keyUpHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = false;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = false;
    }
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, paddleY, paddleWidth, paddleHeight);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}

function getColor(hits) {
    switch (hits) {
        case 1:
            return "#0095DD";
        case 2:
            return "#FF5733";
        case 3:
            return "#C70039";
        default:
            return "#0095DD"; // 默认颜色
    }
}

// 在 drawBricks 中加入隐藏砖块的显示逻辑
function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                b.x = brickX;
                b.y = brickY;

                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = b.color;
                ctx.globalAlpha = b.opacity; // 设置透明度
                ctx.fill();
                ctx.closePath();

                ctx.globalAlpha = 1.0; // 重置透明度

                // 显示砖块的击打次数
                if (b.hitsRequired > 0) {
                    ctx.fillStyle = "white";
                    ctx.font = "12px Arial";
                    ctx.fillText(
                        b.hitsRequired,
                        brickX + brickWidth / 2 - 8,
                        brickY + brickHeight / 2 + 4
                    );
                }
            }
        }
    }
}

function checkPowerUpCollision() {
    powerUps.forEach((powerUp, index) => {
        // 检查道具是否与桿子碰撞
        if (
            powerUp.y + powerUp.radius >= paddleY &&
            powerUp.y - powerUp.radius <= paddleY + paddleHeight &&
            powerUp.x > paddleX &&
            powerUp.x < paddleX + paddleWidth
        ) {
            applyPowerUp(powerUp.type); // 应用效果
            powerUps.splice(index, 1); // 移除道具
        } else if (powerUp.y > canvas.height) {
            powerUps.splice(index, 1); // 移除超出边界的道具
        }
    });
}

class PowerUp {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.dy = 2;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.type === "expand" ? "green" : "yellow";
        ctx.fill();
        ctx.closePath();
    }

    update() {
        this.y += this.dy; // 下落逻辑
    }
}

class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.lifetime = 60; // 爆炸持续的帧数，控制GIF的显示时间
        this.currentFrame = 0; // 当前帧索引
        this.isActive = true; // 爆炸是否活跃
    }

    update() {
        if (this.currentFrame < this.lifetime) {
            this.currentFrame++;
        } else {
            this.isActive = false; // 爆炸结束
        }
    }

    draw(ctx) {
        if (this.isActive) {
            ctx.drawImage(
                explosionGif,
                this.x - explosionGif.width / 2,
                this.y - explosionGif.height / 2
            );
        }
    }
}

function gameOver(message) {
    if (timeChallengeMode) {
        message += " (時間挑戰模式)";
    }
    document.getElementById("gameOverModal").style.display = "flex";
    document.getElementById("gameOverMessage").innerText = message;
}

function drawScore() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("得分: " + score, 8, 20);

    return ctx.measureText("得分: " + score).width; // 返回得分文本的宽度
}

// 绘制连击数
function drawCombo() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#FF5733"; // 连击颜色
    ctx.fillText("連擊数: " + comboCount, 8 + scoreWidth + 20, 20);
}

function drawLives() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("生命: " + lives, canvas.width - 65, 20);
}

function drawCombo() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("連擊: " + comboCount, canvas.width - 800, 20);
}

function drawPowerUps() {
    powerUps.forEach((powerUp, index) => {
        if (powerUp instanceof PowerUp) {
            // 确保是 PowerUp 的实例
            powerUp.update();
            powerUp.draw(ctx);
            // 检查是否需要移除道具
            if (powerUp.y > canvas.height) {
                powerUps.splice(index, 1); // 移除超出边界的道具
            }
        }
    });
}

function applyPowerUp(type) {
    if (type === "expand") {
        paddleWidth *= 1.5; // 扩大挡板
        powerUpStatus = "擋板放大中";
        powerUpRemaining = 10; // 设置剩余时间
        powerUpActive = true; // 標記為有效
        setTimeout(() => {
            paddleWidth /= 1.5; // 还原挡板
            powerUpActive = false; // 標記為無效
        }, 5000);
    } else if (type === "speedUp") {
        dx *= 1.5; // 加速球
        dy *= 1.5;
        powerUpStatus = "速度提升中";
        powerUpRemaining = 10; // 设置剩余时间
        powerUpActive = true; // 標記為有效
        setTimeout(() => {
            dx /= 1.5; // 还原速度
            dy /= 1.5;
            powerUpActive = false; // 標記為無效
        }, 10000);
    }
}

function updatePowerUpDisplay() {
    const powerUpDisplay = document.getElementById("powerUpStatus");
    if (powerUpActive) {
        powerUpDisplay.style.visibility = "visible";
        powerUpDisplay.textContent = `${powerUpStatus} 剩余: ${powerUpRemaining.toFixed(
            1
        )} 秒`;
        powerUpRemaining -= 0.01; // 每100ms减少剩余时间

        if (powerUpRemaining <= 0) {
            powerUpActive = false; // 道具效果结束
            powerUpDisplay.style.visibility = "hidden"; // 隐藏状态
        }
    } else {
        powerUpDisplay.style.visibility = "hidden"; // 隐藏状态
    }
}

function restartGame() {
    document.getElementById("gameOverModal").style.display = "none";
    score = 0;
    lives = 3;
    if (timeChallengeMode) {
        startTimeChallenge(); // 启动时间挑战模式
    }
    resetBall();
    resetPaddle(); // 重置桿子的位置
    resetBricks(); // 根據難度重置磚塊
    document.getElementById("gameScreen").style.display = "block"; // 顯示遊戲畫面
    draw(); // 開始繪製遊戲畫面
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(); // 绘制背景
    drawBricks();
    drawBall();
    drawPaddle();
    drawScore();
    drawLives();
    const scoreWidth = drawScore(); // 绘制得分并获取宽度
    drawCombo(scoreWidth); // 传入得分宽度绘制连击数
    drawPowerUps(); // 繪製道具
    collisionDetection();
    checkPowerUpCollision(); // 檢查道具碰撞

    if (ballLaunched) {
        updateBall(); // 處理球的邏輯
    }

    handleJump(); // 处理桿子的跳跃逻辑
    updatePowerUpDisplay(); // 更新道具状态显示

    // 畫出剩餘時間
    if (timeChallengeMode) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#0095DD";

        // 计算文本的宽度
        const text = `剩餘時間: ${remainingTime.toFixed(1)} 秒`;
        const textWidth = ctx.measureText(text).width;

        // 将文本绘制在画布的中心最上方
        ctx.fillText(text, (canvas.width - textWidth) / 2, 20);

        // 更新剩餘時間
        remainingTime -= 0.01; // 每帧减少时间
        if (lives <= 0) {
            gameOver("遊戲结束！分数: " + score); // 显示生命为0的提示
            return; // 结束游戏
        }
        if (remainingTime <= 0) {
            resetBall(); // 重置球的位置
            ballLaunched = false; // 停止球
            gameOver("時間到！分数: " + score);
            return; // 结束游戏
        }
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.update();
        explosion.draw(ctx);

        if (!explosion.isActive) {
            explosions.splice(i, 1); // 移除已完成的爆炸效果
        }
    }

    requestAnimationFrame(draw);
}

function returnToMainMenu() {
    document.getElementById("gameOverModal").style.display = "none";
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("startScreen").style.display = "block";
    timeChallengeMode = false; // 启用时间挑战模式
    resetGame(); // 重置遊戲
}

function resetGame() {
    score = 0;
    lives = 3;
    resetBall();
    resetPaddle(); // 重置桿子的位置
    resetBricks(); // 根據難度重置磚塊
}

document.getElementById("restartButton").addEventListener("click", restartGame);
document
    .getElementById("mainMenuButton")
    .addEventListener("click", returnToMainMenu);
document.getElementById("startButton").addEventListener("click", startGame);
canvas.addEventListener("mousemove", mouseMoveHandler);
canvas.addEventListener("mousedown", mouseDownHandler);
document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
