// The stickman who pushes the ball, drawn side-on beside it like the reference's character: feet on
// the ball's ground line, leaning in, hands on the glass, legs running while it rolls. He faces the
// way the ball last moved sideways.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class Pusher {
  constructor() {
    this.face = 1;          // 1: pushing to the right, -1: to the left
    this.phase = 0;         // run cycle
    this.lean = 0.15;
  }

  // (cx, cy, R): the ball on screen. (vx, vy): its velocity in screen px/s.
  draw(g, cx, cy, R, vx, vy, dt) {
    const speed = Math.hypot(vx, vy);
    if (Math.abs(vx) > 6) this.face = Math.sign(vx);
    const moving = speed > 12;
    this.phase += dt * (moving ? clamp(speed / 28, 5, 16) : 0);
    this.lean += ((moving ? 0.42 : 0.16) - this.lean) * Math.min(1, dt * 6);

    const H = clamp(R * 1.15, 46, 124);                     // his height on screen
    const f = this.face, lean = this.lean;
    const line = Math.max(2, H * 0.045);

    // His skeleton facing right, origin between his feet on the ground (y up is negative).
    const hip = [Math.sin(lean) * H * 0.08, -H * 0.5];
    const neck = [hip[0] + Math.sin(lean) * H * 0.3, hip[1] - Math.cos(lean) * H * 0.3];
    const head = [neck[0] + Math.sin(lean) * H * 0.12, neck[1] - Math.cos(lean) * H * 0.12];

    // Stand where his hands meet the ball at chest height, arms nearly straight.
    const ground = cy + R;
    const armLen = H * 0.36;
    const chestY = ground + neck[1] + H * 0.06;
    const dy = clamp(chestY - cy, -R * 0.92, R * 0.92);
    const contact = [cx - f * Math.sqrt(R * R - dy * dy), cy + dy];
    const neckY = ground + neck[1];
    const reach = Math.sqrt(Math.max(0, (armLen * 0.92) ** 2 - (contact[1] - neckY) ** 2));
    const ox = contact[0] - f * reach - f * neck[0];
    const at = ([x, y]) => [ox + f * x, ground + y];        // skeleton → screen

    // Legs: thighs swing opposite, shins fold on the back swing.
    const thigh = H * 0.27, shin = H * 0.25;
    const leg = side => {
      const s = moving ? Math.sin(this.phase + side * Math.PI) : side * 0.25 - 0.1;
      const a = s * 0.65 + lean * 0.3;
      const knee = [hip[0] + Math.sin(a) * thigh, hip[1] + Math.cos(a) * thigh];
      const fold = moving ? Math.max(0, -Math.cos(this.phase + side * Math.PI)) * 0.9 : 0.05;
      const b = a - fold;
      return [knee, [knee[0] + Math.sin(b) * shin, knee[1] + Math.cos(b) * shin]];
    };

    // Arms: two-bone reach from the neck to the contact point, elbows bending down.
    const hand = off => {
      const n = at(neck), c = [contact[0] - f * line * 0.6, contact[1] + off];
      const ax = c[0] - n[0], ay = c[1] - n[1], len = Math.hypot(ax, ay) || 1;
      const ux = ax / len, uy = ay / len, d = Math.min(len, armLen * 0.999);
      const tip = [n[0] + ux * d, n[1] + uy * d];
      const bend = Math.sqrt(Math.max(0, (armLen / 2) ** 2 - (d / 2) ** 2));
      let px = -uy, py = ux;
      if (py < 0) { px = -px; py = -py; }                   // elbows bend downward
      return [n, [(n[0] + tip[0]) / 2 + px * bend, (n[1] + tip[1]) / 2 + py * bend], tip];
    };

    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = '#111';
    g.lineWidth = line;

    // A soft shadow under his feet.
    const feetX = at([0, 0])[0];
    g.fillStyle = 'rgba(0,0,0,.12)';
    g.beginPath(); g.ellipse(feetX, ground, H * 0.22, H * 0.04, 0, 0, 7); g.fill();

    const path = pts => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke(); };
    for (const side of [1, 0]) { const [knee, foot] = leg(side); path([at(hip), at(knee), at(foot)]); }
    path([at(hip), at(neck)]);
    path(hand(-line * 1.2));
    path(hand(line * 1.2));

    const [hx, hy] = at(head);
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(hx, hy, H * 0.095, 0, 7); g.fill(); g.stroke();
    g.restore();
  }
}
