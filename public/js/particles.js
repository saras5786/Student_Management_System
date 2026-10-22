// ==============================================================================
// OOP CONCEPT: ENCAPSULATION & COMPOSITION (ADITYA BRAND TUNED)
// File: public/js/particles.js
// 
// Particle physics on light canvas utilizing the Aditya University brand palette:
// Official Aditya Orange, Deep University Navy, Sun Gold, and Academic Sky Blue.
// ==============================================================================

class Particle {
    #x;
    #y;
    #vx;
    #vy;
    #radius;
    #baseRadius;
    #alpha;
    #colorType; // 0 = Official Aditya Orange (#f26522), 1 = Official Aditya Navy Blue (#003b71)

    #pulse;

    constructor(x, y) {
        this.#x = x;
        this.#y = y;
        // Ultra-slow, serene, graceful drift
        this.#vx = (Math.random() - 0.5) * 0.22;
        this.#vy = (Math.random() - 0.5) * 0.22;
        this.#baseRadius = Math.random() * 2.0 + 1.6;
        this.#radius = this.#baseRadius;
        this.#alpha = Math.random() * 0.3 + 0.5;
        // Strictly Aditya University colors: Orange (0) and Navy Blue (1) only
        this.#colorType = Math.random() < 0.5 ? 0 : 1;
        this.#pulse = Math.random() * Math.PI * 2;
    }

    get x() { return this.#x; }
    get y() { return this.#y; }
    get radius() { return this.#radius; }
    get alpha() { return this.#alpha; }
    get colorType() { return this.#colorType; }

    update(width, height, mouseX, mouseY, mouseRadius = 130) {
        this.#x += this.#vx;
        this.#y += this.#vy;
        this.#pulse += 0.015;

        if (this.#x < 0 || this.#x > width) this.#vx = -this.#vx;
        if (this.#y < 0 || this.#y > height) this.#vy = -this.#vy;

        const breathing = Math.sin(this.#pulse) * 0.4;

        if (mouseX !== null && mouseY !== null) {
            const dx = this.#x - mouseX;
            const dy = this.#y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < mouseRadius) {
                const force = (mouseRadius - dist) / mouseRadius;
                const angle = Math.atan2(dy, dx);
                this.#x += Math.cos(angle) * force * 1.2;
                this.#y += Math.sin(angle) * force * 1.2;
                this.#radius = this.#baseRadius + breathing + force * 1.6;
            } else {
                this.#radius = this.#baseRadius + breathing;
            }
        } else {
            this.#radius = this.#baseRadius + breathing;
        }
    }

    draw(ctx, brandOrangeHue, brandBlueHue) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.#x, this.#y, this.#radius, 0, Math.PI * 2);

        // Official Aditya University Palette ONLY
        let fillStyle = '';
        if (this.#colorType === 0) {
            // Official Aditya Orange (#f26522)
            fillStyle = `hsla(${brandOrangeHue}, 94%, 54%, ${this.#alpha})`;
        } else {
            // Official Aditya Deep Navy Blue (#003b71)
            fillStyle = `hsla(${brandBlueHue}, 96%, 30%, ${this.#alpha})`;
        }

        ctx.fillStyle = fillStyle;
        ctx.shadowBlur = 10;
        ctx.shadowColor = fillStyle;
        ctx.fill();
        ctx.restore();
    }
}

export class ParticleAnimation {
    #canvas;
    #ctx;
    #particles = [];
    #animationFrameId = null;
    #lastTime = 0;
    #mouseX = null;
    #mouseY = null;
    #width = 0;
    #height = 0;
    #brandOrangeHue = 24;
    #brandBlueHue = 214;
    #isRunning = false;
    #connectionMaxDist = 110;

    constructor(canvasElement) {
        this.#canvas = canvasElement;
        this.#ctx = this.#canvas.getContext('2d');
    }

    initialize() {
        this.resize();
        this.#bindEvents();
        this.#spawnParticles();
        this.#isRunning = true;
        this.#lastTime = performance.now();
        this.#loop();
    }

    #spawnParticles() {
        this.#particles = [];
        // Reduced density for a spacious, clean, and elegant visual aesthetic
        const density = Math.floor((this.#width * this.#height) / 40000);
        const count = Math.min(Math.max(density, 16), 36);

        for (let i = 0; i < count; i++) {
            const x = Math.random() * this.#width;
            const y = Math.random() * this.#height;
            this.#particles.push(new Particle(x, y));
        }
    }

    #bindEvents() {
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e.clientX, e.clientY);
        });
        window.addEventListener('mouseleave', () => {
            this.#mouseX = null;
            this.#mouseY = null;
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
    }

    handleMouseMove(x, y) {
        this.#mouseX = x;
        this.#mouseY = y;
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.#width = window.innerWidth;
        this.#height = window.innerHeight;
        this.#canvas.width = this.#width * dpr;
        this.#canvas.height = this.#height * dpr;
        this.#ctx.scale(dpr, dpr);
    }

    setBrandHues(orangeHue, blueHue) {
        this.#brandOrangeHue = orangeHue;
        this.#brandBlueHue = blueHue;
    }

    #loop = (currentTime = performance.now()) => {
        if (!this.#isRunning) return;

        const deltaTime = currentTime - this.#lastTime;
        this.#lastTime = currentTime;

        this.update(deltaTime);
        this.draw();

        this.#animationFrameId = requestAnimationFrame(this.#loop);
    };

    update(deltaTime) {
        for (const p of this.#particles) {
            p.update(this.#width, this.#height, this.#mouseX, this.#mouseY);
        }
    }

    draw() {
        this.#ctx.clearRect(0, 0, this.#width, this.#height);

        // Interactive cursor radiant ambient halo in Aditya colors
        if (this.#mouseX !== null && this.#mouseY !== null) {
            const cursorGlow = this.#ctx.createRadialGradient(
                this.#mouseX, this.#mouseY, 0,
                this.#mouseX, this.#mouseY, 170
            );
            cursorGlow.addColorStop(0, `hsla(${this.#brandOrangeHue}, 96%, 56%, 0.16)`);
            cursorGlow.addColorStop(0.55, `hsla(${this.#brandBlueHue}, 96%, 32%, 0.09)`);
            cursorGlow.addColorStop(1, 'transparent');
            this.#ctx.fillStyle = cursorGlow;
            this.#ctx.beginPath();
            this.#ctx.arc(this.#mouseX, this.#mouseY, 170, 0, Math.PI * 2);
            this.#ctx.fill();
        }

        const count = this.#particles.length;
        for (let i = 0; i < count; i++) {
            const p1 = this.#particles[i];
            for (let j = i + 1; j < count; j++) {
                const p2 = this.#particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.#connectionMaxDist) {
                    const alpha = (1 - dist / this.#connectionMaxDist) * 0.12;
                    this.#ctx.beginPath();
                    this.#ctx.moveTo(p1.x, p1.y);
                    this.#ctx.lineTo(p2.x, p2.y);
                    // Interconnecting Aditya Orange and Aditya Navy lines
                    if (p1.colorType === 0 && p2.colorType === 0) {
                        this.#ctx.strokeStyle = `hsla(${this.#brandOrangeHue}, 94%, 52%, ${alpha})`;
                    } else if (p1.colorType === 1 && p2.colorType === 1) {
                        this.#ctx.strokeStyle = `hsla(${this.#brandBlueHue}, 96%, 30%, ${alpha})`;
                    } else {
                        this.#ctx.strokeStyle = `hsla(${this.#brandOrangeHue}, 90%, 50%, ${alpha * 0.85})`;
                    }
                    this.#ctx.lineWidth = 0.7;
                    this.#ctx.stroke();
                }
            }
            p1.draw(this.#ctx, this.#brandOrangeHue, this.#brandBlueHue);
        }
    }

    pause() {
        this.#isRunning = false;
        if (this.#animationFrameId) {
            cancelAnimationFrame(this.#animationFrameId);
            this.#animationFrameId = null;
        }
    }

    resume() {
        if (!this.#isRunning) {
            this.#isRunning = true;
            this.#lastTime = performance.now();
            this.#loop();
        }
    }

    destroy() {
        this.pause();
        this.#particles = [];
    }
}
