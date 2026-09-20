// ==============================================================================
// OOP CONCEPT: ENCAPSULATION & COMPOSITION (LIGHT THEME OPTIMIZED)
// File: public/js/particles.js
// 
// Particle state and physics behavior are contained entirely inside Particle
// and ParticleAnimation classes. High-performance 60FPS Canvas rendering with
// spatial proximity connections and mouse-repulsion physics on light canvas.
// ==============================================================================

class Particle {
    // OOP CONCEPT: ENCAPSULATION (PRIVATE FIELDS)
    #x;
    #y;
    #vx;
    #vy;
    #radius;
    #baseRadius;
    #alpha;
    #colorOffset;

    constructor(x, y) {
        this.#x = x;
        this.#y = y;
        // Velocity between -0.4 and +0.4 pixels/frame for graceful subtle drift
        this.#vx = (Math.random() - 0.5) * 0.75;
        this.#vy = (Math.random() - 0.5) * 0.75;
        this.#baseRadius = Math.random() * 2.0 + 1.4;
        this.#radius = this.#baseRadius;
        this.#alpha = Math.random() * 0.4 + 0.5;
        this.#colorOffset = Math.random() * 60 - 30; // subtle color variation between particles
    }

    get x() { return this.#x; }
    get y() { return this.#y; }
    get radius() { return this.#radius; }
    get alpha() { return this.#alpha; }

    /**
     * Update particle position and bounce off canvas boundaries.
     */
    update(width, height, mouseX, mouseY, mouseRadius = 140) {
        this.#x += this.#vx;
        this.#y += this.#vy;

        if (this.#x < 0 || this.#x > width) this.#vx = -this.#vx;
        if (this.#y < 0 || this.#y > height) this.#vy = -this.#vy;

        // Gentle mouse repulsion
        if (mouseX !== null && mouseY !== null) {
            const dx = this.#x - mouseX;
            const dy = this.#y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < mouseRadius) {
                const force = (mouseRadius - dist) / mouseRadius;
                const angle = Math.atan2(dy, dx);
                this.#x += Math.cos(angle) * force * 2.6;
                this.#y += Math.sin(angle) * force * 2.6;
                this.#radius = this.#baseRadius + force * 2.5;
            } else {
                this.#radius = this.#baseRadius;
            }
        } else {
            this.#radius = this.#baseRadius;
        }
    }

    draw(ctx, hue) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.#x, this.#y, this.#radius, 0, Math.PI * 2);
        // Rich vibrant saturation and 45% lightness for maximum crispness on light background
        ctx.fillStyle = `hsla(${hue + this.#colorOffset}, 85%, 45%, ${this.#alpha})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `hsla(${hue + this.#colorOffset}, 85%, 50%, 0.4)`;
        ctx.fill();
        ctx.restore();
    }
}

export class ParticleAnimation {
    // OOP CONCEPT: ENCAPSULATION
    #canvas;
    #ctx;
    #particles = [];
    #animationFrameId = null;
    #lastTime = 0;
    #mouseX = null;
    #mouseY = null;
    #width = 0;
    #height = 0;
    #hue = 215;
    #isRunning = false;
    #connectionMaxDist = 115;

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
        const density = Math.floor((this.#width * this.#height) / 14000);
        const count = Math.min(Math.max(density, 40), 110);

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

    setHue(hue) {
        this.#hue = hue;
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

        // Connecting lines with subtle color
        const count = this.#particles.length;
        for (let i = 0; i < count; i++) {
            const p1 = this.#particles[i];
            for (let j = i + 1; j < count; j++) {
                const p2 = this.#particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.#connectionMaxDist) {
                    const alpha = (1 - dist / this.#connectionMaxDist) * 0.18;
                    this.#ctx.beginPath();
                    this.#ctx.moveTo(p1.x, p1.y);
                    this.#ctx.lineTo(p2.x, p2.y);
                    this.#ctx.strokeStyle = `hsla(${this.#hue}, 80%, 46%, ${alpha})`;
                    this.#ctx.lineWidth = 0.9;
                    this.#ctx.stroke();
                }
            }
            p1.draw(this.#ctx, this.#hue);
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
