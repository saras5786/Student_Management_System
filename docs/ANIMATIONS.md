# Interactive Visuals, Animations & Canvas Engine
## Aditya University Student Management System (AU-SMS)

This document explains the mathematical foundations, physics calculations, and performance optimizations implemented in the AU-SMS UI animation system.

---

## 1. Canvas Interactive Particle System (`public/js/particles.js`)

### 1.1 Object-Oriented Particle Architecture
The animation engine is encapsulated inside the `ParticleAnimation` class which composes an array of `Particle` objects.

```
       ParticleAnimation (Canvas Manager)
               │
       ┌───────┴───────┬───────────────┐
       ▼               ▼               ▼
  Particle #1     Particle #2     Particle #N
  - (x, y)        - (x, y)        - (x, y)
  - (vx, vy)      - (vx, vy)      - (vx, vy)
  - radius        - radius        - radius
```

### 1.2 Physics & Vector Movement
Each particle maintains a 2D position vector $\vec{P} = (x, y)$ and a velocity vector $\vec{V} = (v_x, v_y)$. At each frame update:
$$x_{t+1} = x_t + v_x$$
$$y_{t+1} = y_t + v_y$$

When a particle strikes any of the viewport boundaries ($0, W$) or ($0, H$), its velocity component is reflected:
$$v_x = -v_x \quad \text{if} \quad x < 0 \lor x > W$$
$$v_y = -v_y \quad \text{if} \quad y < 0 \lor y > H$$

### 1.3 Mouse Interaction (Repulsion & Glow)
When the user moves the cursor to $(x_m, y_m)$, the Euclidean distance $d$ to each particle is calculated:
$$d = \sqrt{(x - x_m)^2 + (y - y_m)^2}$$

If $d < R_{\text{mouse}}$ (set to $140\text{px}$):
1. The repulsion force factor is normalized:
   $$F = \frac{R_{\text{mouse}} - d}{R_{\text{mouse}}}$$
2. The directional angle is resolved using $\theta = \text{atan2}(y - y_m, x - x_m)$.
3. The particle is pushed along $\theta$:
   $$x \mathrel{+}= \cos(\theta) \cdot F \cdot 2.5$$
   $$y \mathrel{+}= \sin(\theta) \cdot F \cdot 2.5$$
4. The particle radius expands dynamically:
   $$r = r_{\text{base}} + F \cdot 2.0$$

### 1.4 Spatial Proximity Mesh Lines
For every pair of particles $(P_i, P_j)$, the distance is computed. If $d < D_{\max}$ ($110\text{px}$):
An alpha-blended line is drawn between them where the opacity is inversely proportional to distance:
$$\alpha = \left(1 - \frac{d}{D_{\max}}\right) \times 0.16$$
This creates a subtle, constellation-like web that reacts organically as particles move.

---

## 2. Dynamic Ambient Color Transition Engine

The background ambient lighting transitions gradually between dark blue, deep purple, royal blue, and cyan.

- **Implementation**: In `public/js/app.js`, an interpolation timer runs every $80\text{ms}$ adjusting the hue angle $\theta_{\text{hue}}$ between $190^\circ$ and $280^\circ$:
```javascript
// Shifts hue smoothly by 0.08 deg per tick
document.documentElement.style.setProperty('--bg-hue', Math.round(this.#currentHue));
this.#particles.setHue(Math.round(this.#currentHue));
```
- **CSS Variable Integration**:
```css
.dynamic-aura {
    background: 
        radial-gradient(circle at 20% 30%, hsla(var(--bg-hue), 80%, 35%, 0.18) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, hsla(calc(var(--bg-hue) + 40), 80%, 35%, 0.15) 0%, transparent 50%);
}
```

---

## 3. Circular Attendance Progress Ring Math

The circular gauge in the Student Attendance tab uses SVG stroke-dasharray calculations:

- Circle Radius $r = 90\text{px}$
- Circumference $C = 2 \pi r \approx 2 \times 3.14159 \times 90 \approx 565.48\text{px}$
- Dynamic Stroke Offset:
$$\text{offset} = C - \left(\frac{\text{attendance}}{100}\right) \times C$$

CSS transition provides smooth deceleration:
```css
.ring-bar {
    stroke-dasharray: 565.48;
    stroke-dashoffset: 565.48;
    transition: stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 4. Performance & Accessibility Optimizations

1. **Tab Visibility Optimization**:
   The canvas animation listens for `document.addEventListener('visibilitychange')`. When the tab is minimized or hidden, `cancelAnimationFrame` immediately pauses execution, ensuring zero CPU/battery drain in background tabs.
2. **Device Pixel Ratio (DPR) Scaling**:
   Canvas dimensions scale to `window.devicePixelRatio` capped at $2\times$ to render crisp retina graphics without overburdening GPUs on ultra-high-resolution displays.
3. **Reduced Motion Accessibility**:
   A media query `@media (prefers-reduced-motion: reduce)` automatically disables high-frequency animations and hides the particle canvas for users with vestibular sensitivity.
