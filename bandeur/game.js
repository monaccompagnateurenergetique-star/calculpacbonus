/* ===============================================================
   LE BANDEUR — jeu mobile du bandeur de BA13
   Tu poses le doigt sur le joint, tu descends, tu lisses.
   Ton couteau suit ta main : la bande sera aussi droite que toi.
   =============================================================== */

(function () {
'use strict';

/* --------------------------------------------------------------
   Petits outils
   -------------------------------------------------------------- */

var $ = function (sel) { return document.querySelector(sel); };

function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }
function lerp(a, b, t) { return a + (b - a) * t; }

// Générateur pseudo-aléatoire déterministe : un même chantier
// replace toujours ses cloques aux mêmes endroits.
function makeRng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

/* --------------------------------------------------------------
   Les chantiers
   Coordonnées normalisées (0 → 1) dans la zone de jeu.
   -------------------------------------------------------------- */

var LEVELS = [
    {
        name: "La chambre du fond",
        desc: "Un joint vertical. On se met en jambes.",
        time: 26,
        joints: [{ pts: [[0.50, 0.07], [0.50, 0.93]], bubbles: 0 }]
    },
    {
        name: "Le couloir",
        desc: "Deux montants d'affilée, sans traîner.",
        time: 34,
        joints: [
            { pts: [[0.30, 0.07], [0.30, 0.93]], bubbles: 1 },
            { pts: [[0.70, 0.07], [0.70, 0.93]], bubbles: 1 }
        ]
    },
    {
        name: "La cloison basse",
        desc: "Un joint filant à l'horizontale, puis un montant.",
        time: 32,
        joints: [
            { pts: [[0.06, 0.42], [0.94, 0.42]], bubbles: 1 },
            { pts: [[0.52, 0.46], [0.52, 0.94]], bubbles: 1 }
        ]
    },
    {
        name: "L'angle du placard",
        desc: "Un angle rentrant. Dans l'angle, on ralentit.",
        time: 30,
        joints: [{ pts: [[0.22, 0.08], [0.22, 0.62], [0.88, 0.62]], bubbles: 2 }]
    },
    {
        name: "Le plafond du séjour",
        desc: "Bras en l'air, deux filants. L'enduit tombe.",
        time: 34,
        joints: [
            { pts: [[0.05, 0.28], [0.95, 0.28]], bubbles: 2 },
            { pts: [[0.05, 0.68], [0.95, 0.68]], bubbles: 2 }
        ]
    },
    {
        name: "Le T du dégagement",
        desc: "Un montant qui meurt sur un filant.",
        time: 34,
        joints: [
            { pts: [[0.50, 0.06], [0.50, 0.54]], bubbles: 1 },
            { pts: [[0.08, 0.56], [0.92, 0.56]], bubbles: 2 }
        ]
    },
    {
        name: "La cage d'escalier",
        desc: "Une rampante. Faut suivre la pente.",
        time: 34,
        joints: [
            { pts: [[0.10, 0.92], [0.90, 0.12]], bubbles: 2 },
            { pts: [[0.74, 0.30], [0.74, 0.94]], bubbles: 1 }
        ]
    },
    {
        name: "Les combles",
        desc: "Du zigzag et des angles partout.",
        time: 38,
        joints: [{ pts: [[0.16, 0.07], [0.82, 0.30], [0.18, 0.56], [0.84, 0.90]], bubbles: 4 }]
    },
    {
        name: "Le grand mur",
        desc: "Trois montants, une seule gâchée.",
        time: 42,
        joints: [
            { pts: [[0.22, 0.06], [0.22, 0.94]], bubbles: 1 },
            { pts: [[0.50, 0.06], [0.50, 0.94]], bubbles: 2 },
            { pts: [[0.78, 0.06], [0.78, 0.94]], bubbles: 1 }
        ]
    },
    {
        name: "Le chantier du vendredi",
        desc: "Livraison lundi. Bon courage.",
        time: 46,
        joints: [
            { pts: [[0.14, 0.06], [0.14, 0.50], [0.62, 0.50]], bubbles: 2 },
            { pts: [[0.86, 0.08], [0.86, 0.92]], bubbles: 2 },
            { pts: [[0.08, 0.72], [0.74, 0.72]], bubbles: 2 },
            { pts: [[0.40, 0.06], [0.40, 0.44]], bubbles: 1 }
        ]
    }
];

var STAR_1 = 60, STAR_2 = 80, STAR_3 = 92;

/* --------------------------------------------------------------
   Réglages du geste (exprimés en fraction de la hauteur du mur,
   pour que ça se joue pareil sur un petit et sur un grand écran)
   -------------------------------------------------------------- */

var K = {
    speedIdeal:   0.26,   // vitesse de croisière du couteau (H/s)
    speedMinOk:   0.17,
    speedMaxOk:   0.37,
    speedDisplay: 0.62,   // fond d'échelle de la jauge
    speedSlow:    0.155,  // au-dessous : on chasse les cloques
    tolPerfect:   0.013,  // écart au joint : impeccable
    tolOk:        0.032,  // écart au joint : acceptable
    tolOff:       0.055,  // au-delà : on tartine la plaque
    leadMax:      0.13,   // le doigt ne doit pas fuir devant le couteau
    stepMax:      1.05,   // avance maxi du couteau (H/s)
    bandWidth:    0.042,  // largeur de bande de référence
    bubbleR:      0.028,
    cornerWin:    0.055,  // fenêtre de ralentissement avant/après un angle
    cornerSpeed:  0.24
};

/* --------------------------------------------------------------
   Sauvegarde
   -------------------------------------------------------------- */

var SAVE_KEY = 'bandeur.v1';
var save = { stars: {}, sound: true };

function loadSave() {
    try {
        var raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            var d = JSON.parse(raw);
            if (d && typeof d === 'object') {
                save.stars = d.stars || {};
                save.sound = d.sound !== false;
            }
        }
    } catch (e) { /* navigation privée : on joue sans mémoire */ }
}

function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

function totalStars() {
    var t = 0;
    for (var k in save.stars) { if (save.stars.hasOwnProperty(k)) t += save.stars[k]; }
    return t;
}

function isUnlocked(i) {
    return i === 0 || (save.stars[i - 1] || 0) >= 1;
}

/* --------------------------------------------------------------
   Son : un peu de grattage de couteau, rien de plus
   -------------------------------------------------------------- */

var Audio_ = {
    ctx: null, noise: null, filter: null, gain: null, ready: false,

    init: function () {
        if (this.ctx) return;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try {
            this.ctx = new AC();
            var len = Math.floor(this.ctx.sampleRate * 1.4);
            var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            var data = buf.getChannelData(0);
            var last = 0;
            for (var i = 0; i < len; i++) {
                // bruit brun : ça racle, ça ne siffle pas
                last = (last + (Math.random() * 2 - 1) * 0.06) * 0.985;
                data[i] = last * 3.2;
            }
            this.noise = this.ctx.createBufferSource();
            this.noise.buffer = buf;
            this.noise.loop = true;
            this.filter = this.ctx.createBiquadFilter();
            this.filter.type = 'bandpass';
            this.filter.frequency.value = 900;
            this.filter.Q.value = 0.7;
            this.gain = this.ctx.createGain();
            this.gain.gain.value = 0;
            this.noise.connect(this.filter);
            this.filter.connect(this.gain);
            this.gain.connect(this.ctx.destination);
            this.noise.start(0);
            this.ready = true;
        } catch (e) { this.ready = false; }
    },

    resume: function () {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    scrape: function (speed) {
        if (!this.ready) return;
        var v = save.sound ? clamp(speed / K.speedDisplay, 0, 1) : 0;
        this.gain.gain.setTargetAtTime(v * 0.16, this.ctx.currentTime, 0.05);
        this.filter.frequency.setTargetAtTime(500 + v * 1600, this.ctx.currentTime, 0.05);
    },

    silence: function () {
        if (!this.ready) return;
        this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    },

    blip: function (freq, dur, type, vol) {
        if (!this.ready || !save.sound) return;
        var o = this.ctx.createOscillator();
        var g = this.ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, this.ctx.currentTime);
        g.gain.setValueAtTime(vol || 0.14, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(); o.stop(this.ctx.currentTime + dur + 0.02);
    },

    pop:    function () { this.blip(620, 0.09, 'triangle', 0.2); },
    good:   function () { this.blip(760, 0.14, 'sine', 0.16); },
    bad:    function () { this.blip(150, 0.18, 'sawtooth', 0.1); },
    fanfare: function () {
        var self = this, notes = [523, 659, 784, 1046];
        notes.forEach(function (f, i) {
            setTimeout(function () { self.blip(f, 0.22, 'triangle', 0.14); }, i * 110);
        });
    }
};

/* --------------------------------------------------------------
   Géométrie du joint
   -------------------------------------------------------------- */

function buildPath(ptsNorm, W, H) {
    var pts = ptsNorm.map(function (p) { return { x: p[0] * W, y: p[1] * H }; });
    var segs = [], total = 0, corners = [];
    for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        var dx = b.x - a.x, dy = b.y - a.y;
        var len = Math.hypot(dx, dy);
        segs.push({ a: a, b: b, dx: dx, dy: dy, len: len, start: total });
        if (i > 0) corners.push(total);
        total += len;
    }
    return { pts: pts, segs: segs, total: total, corners: corners };
}

function pointAt(path, arc) {
    arc = clamp(arc, 0, path.total);
    for (var i = 0; i < path.segs.length; i++) {
        var s = path.segs[i];
        if (arc <= s.start + s.len || i === path.segs.length - 1) {
            var t = s.len ? clamp((arc - s.start) / s.len, 0, 1) : 0;
            return { x: s.a.x + s.dx * t, y: s.a.y + s.dy * t };
        }
    }
    return { x: path.pts[0].x, y: path.pts[0].y };
}

// Projection du doigt sur le joint, en interdisant de repartir en arrière.
function project(path, px, py, minArc) {
    var best = null;
    for (var i = 0; i < path.segs.length; i++) {
        var s = path.segs[i];
        if (s.start + s.len < minArc - 0.5) continue;
        var t = s.len ? ((px - s.a.x) * s.dx + (py - s.a.y) * s.dy) / (s.len * s.len) : 0;
        t = clamp(t, 0, 1);
        var arc = s.start + t * s.len;
        if (arc < minArc) {
            arc = minArc;
            t = s.len ? (arc - s.start) / s.len : 0;
            if (t > 1) continue;
        }
        var x = s.a.x + s.dx * t, y = s.a.y + s.dy * t;
        var d = Math.hypot(px - x, py - y);
        if (!best || d < best.dist) best = { arc: arc, dist: d, x: x, y: y };
    }
    return best;
}

/* --------------------------------------------------------------
   État du jeu
   -------------------------------------------------------------- */

var canvas = $('#canvas'), ctx = canvas.getContext('2d');
var W = 0, H = 0, DPR = 1;
var decor = null;                 // fond de mur pré-dessiné
var G = null;                     // partie en cours
var rafId = 0, lastT = 0;
var toastTimer = 0;

function newGame(levelIndex) {
    var lvl = LEVELS[levelIndex];
    G = {
        index: levelIndex,
        lvl: lvl,
        joints: [],
        current: 0,
        arc: 0,
        timeLeft: lvl.time,
        running: false,
        finished: false,
        dragging: false,
        finger: null,
        speed: 0,
        offTrack: false,
        offCooldown: 0,
        // mesures
        wQuality: 0, wLength: 0,   // rectitude pondérée par la longueur passée
        wSpeed: 0,
        bubblesTotal: 0, bubblesPopped: 0,
        cornersTotal: 0, cornersClean: 0,
        splats: 0, reprises: 0,
        marks: [],                 // bavures d'enduit sur la plaque
        pops: []                   // animation des cloques crevées
    };
    layoutLevel();
}

// (Re)construit la géométrie du chantier à la taille courante du canvas.
function layoutLevel() {
    if (!G) return;
    var lvl = G.lvl;
    var rng = makeRng((G.index + 1) * 7919);
    // L'avancement est stocké en pixels : on le mémorise en proportion
    // pour le replacer correctement si le mur change de taille.
    var oldJoint = G.joints[G.current];
    var arcFrac = (oldJoint && oldJoint.path.total) ? G.arc / oldJoint.path.total : 0;
    var oldState = G.joints.map(function (j) {
        return {
            bubbles: j.bubbles.map(function (b) { return { popped: b.popped, missed: b.missed }; }),
            corners: j.cornersDone.slice()
        };
    });

    // En cas de rotation d'écran on refait la géométrie : les traces
    // déjà posées ne sont plus à l'échelle, on repart d'un mur propre
    // (l'avancement et les notes, eux, sont conservés).
    G.joints = lvl.joints.map(function (jd, ji) {
        var path = buildPath(jd.pts, W, H);
        var prev = oldState[ji];
        var bubbles = [];
        var n = jd.bubbles || 0;
        for (var b = 0; b < n; b++) {
            // réparties sur le joint, jamais collées aux extrémités
            var f = (b + 0.5 + (rng() - 0.5) * 0.55) / n;
            var kept = prev && prev.bubbles[b];
            bubbles.push({
                arc: clamp(f, 0.08, 0.94) * path.total,
                popped: kept ? kept.popped : false,
                missed: kept ? kept.missed : false
            });
        }
        return {
            path: path,
            bubbles: bubbles,
            cornersDone: path.corners.map(function (_, ci) {
                return prev ? prev.corners[ci] : null;
            }),
            trail: [],
            done: ji < G.current
        };
    });

    var cur = G.joints[G.current];
    G.arc = cur ? arcFrac * cur.path.total : 0;
    G.marks = [];

    G.bubblesTotal = G.joints.reduce(function (a, j) { return a + j.bubbles.length; }, 0);
    G.cornersTotal = G.joints.reduce(function (a, j) { return a + j.path.corners.length; }, 0);
    buildDecor();
}

/* --------------------------------------------------------------
   Décor : la plaque, les grooves, les vis
   -------------------------------------------------------------- */

function buildDecor() {
    if (!W || !H || !G) return;
    decor = document.createElement('canvas');
    decor.width = Math.max(1, Math.floor(W * DPR));
    decor.height = Math.max(1, Math.floor(H * DPR));
    var c = decor.getContext('2d');
    c.scale(DPR, DPR);

    // fond de plaque
    var grad = c.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#e2ddd2');
    grad.addColorStop(0.55, '#d9d4c9');
    grad.addColorStop(1, '#cbc5b8');
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);

    // grain du carton
    var rng = makeRng(4242 + G.index);
    c.globalAlpha = 0.06;
    for (var i = 0; i < 900; i++) {
        var x = rng() * W, y = rng() * H;
        c.fillStyle = rng() > 0.5 ? '#8d8676' : '#ffffff';
        c.fillRect(x, y, 1.6, 1.6);
    }
    c.globalAlpha = 1;

    // les joints creux + les vis de chaque côté
    G.joints.forEach(function (j) {
        var p = j.path;
        c.lineCap = 'round';
        c.lineJoin = 'round';

        c.strokeStyle = 'rgba(120,112,98,.55)';
        c.lineWidth = H * 0.016;
        strokePath(c, p);

        c.strokeStyle = 'rgba(80,74,63,.42)';
        c.lineWidth = H * 0.005;
        strokePath(c, p);

        // vis alignées de part et d'autre du joint
        var step = H * 0.075;
        for (var a = step * 0.5; a < p.total; a += step) {
            var pt = pointAt(p, a);
            var pt2 = pointAt(p, Math.min(p.total, a + 1));
            var dx = pt2.x - pt.x, dy = pt2.y - pt.y;
            var L = Math.hypot(dx, dy) || 1;
            var nx = -dy / L, ny = dx / L;
            var off = H * 0.036;
            [-1, 1].forEach(function (s) {
                c.fillStyle = 'rgba(92,86,74,.5)';
                c.beginPath();
                c.arc(pt.x + nx * off * s, pt.y + ny * off * s, H * 0.0045, 0, 6.2832);
                c.fill();
            });
        }
    });
}

function strokePath(c, p) {
    c.beginPath();
    c.moveTo(p.pts[0].x, p.pts[0].y);
    for (var i = 1; i < p.pts.length; i++) c.lineTo(p.pts[i].x, p.pts[i].y);
    c.stroke();
}

/* --------------------------------------------------------------
   Dimensionnement
   -------------------------------------------------------------- */

function resize() {
    var wrap = canvas.parentElement;
    var r = wrap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2.5);
    W = r.width; H = r.height;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (G) { layoutLevel(); draw(); }
}

/* --------------------------------------------------------------
   Boucle de jeu
   -------------------------------------------------------------- */

function startLoop() {
    lastT = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
}

function tick(now) {
    var dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    if (G && !G.finished) {
        update(dt);
        draw();
        rafId = requestAnimationFrame(tick);
    }
}

function update(dt) {
    // chrono : il ne tourne qu'une fois le premier coup de couteau donné
    if (G.running) {
        G.timeLeft -= dt;
        if (G.timeLeft <= 0) {
            G.timeLeft = 0;
            return finish(false);
        }
    }

    G.offCooldown = Math.max(0, G.offCooldown - dt);

    // animation des cloques crevées
    for (var i = G.pops.length - 1; i >= 0; i--) {
        G.pops[i].t += dt;
        if (G.pops[i].t > 0.5) G.pops.splice(i, 1);
    }

    var joint = G.joints[G.current];
    if (!joint) return;

    if (!G.dragging || !G.finger) {
        G.speed = lerp(G.speed, 0, 1 - Math.pow(0.001, dt));
        Audio_.silence();
        updateGauges();
        return;
    }

    var f = G.finger;
    var cand = project(joint.path, f.x, f.y, G.arc);
    if (!cand) { updateGauges(); return; }

    var lead = cand.arc - G.arc;
    var tolOff = K.tolOff * H;
    var tooFarAhead = lead > K.leadMax * H;
    var off = cand.dist > tolOff || tooFarAhead;

    if (off) {
        // le couteau a quitté le joint : on tartine la plaque
        G.offTrack = true;
        G.speed = lerp(G.speed, 0, 1 - Math.pow(0.02, dt));
        if (G.offCooldown === 0) {
            G.splats++;
            G.offCooldown = 0.55;
            addMark(f.x, f.y);
            toast(tooFarAhead ? "Tu sautes le joint !" : "Hors joint !", 'bad');
            Audio_.bad();
        }
        Audio_.scrape(0.12);
        updateGauges();
        return;
    }

    G.offTrack = false;

    // avance du couteau, plafonnée : on ne téléporte pas une bande
    var step = Math.min(Math.max(0, lead), K.stepMax * H * dt);
    var prevArc = G.arc;
    G.arc = Math.min(joint.path.total, G.arc + step);
    var advanced = G.arc - prevArc;

    // vitesse exprimée en hauteurs de mur par seconde
    var instSpeed = dt > 0 ? (advanced / H) / dt : 0;
    G.speed = lerp(G.speed, instSpeed, 1 - Math.pow(0.0005, dt));

    if (advanced > 0 && !G.running) G.running = true;

    // trace de la bande, posée là où passe la main
    var width = bandWidthFor(G.speed);
    var tr = joint.trail;
    var lastPt = tr.length ? tr[tr.length - 1] : null;
    if (!lastPt || Math.hypot(f.x - lastPt.x, f.y - lastPt.y) > H * 0.004) {
        tr.push({ x: f.x, y: f.y, w: width });
        if (tr.length > 3000) tr.shift();
    }

    if (advanced > 0) {
        // rectitude, pondérée par la longueur réellement bandée
        var q;
        if (cand.dist <= K.tolPerfect * H) q = 1;
        else if (cand.dist <= K.tolOk * H)
            q = 1 - 0.45 * (cand.dist - K.tolPerfect * H) / ((K.tolOk - K.tolPerfect) * H);
        else
            q = 0.55 * (1 - (cand.dist - K.tolOk * H) / ((K.tolOff - K.tolOk) * H));
        G.wQuality += clamp(q, 0, 1) * advanced;

        // régularité du geste
        G.wSpeed += speedScore(G.speed) * advanced;
        G.wLength += advanced;
    }

    Audio_.scrape(G.speed);
    checkBubbles(joint);
    checkCorners(joint);

    if (G.arc >= joint.path.total - 0.5) completeJoint(joint);

    updateGauges();
}

function bandWidthFor(sp) {
    // vite → la bande manque d'enduit ; lentement → bourrelet
    var r = clamp(sp / K.speedIdeal, 0, 2.2);
    return H * K.bandWidth * clamp(1.35 - r * 0.42, 0.5, 1.5);
}

function speedScore(sp) {
    if (sp >= K.speedMinOk && sp <= K.speedMaxOk) return 1;
    if (sp < K.speedMinOk) return clamp(sp / K.speedMinOk, 0, 1) * 0.9;
    return clamp(1 - (sp - K.speedMaxOk) / (K.speedDisplay - K.speedMaxOk), 0, 1) * 0.9;
}

function addMark(x, y) {
    var rng = Math.random;
    for (var i = 0; i < 3; i++) {
        G.marks.push({
            x: x + (rng() - 0.5) * H * 0.05,
            y: y + (rng() - 0.5) * H * 0.05,
            r: H * (0.008 + rng() * 0.014),
            a: 0.35 + rng() * 0.3
        });
    }
    if (G.marks.length > 120) G.marks.splice(0, G.marks.length - 120);
}

function checkBubbles(joint) {
    var r = K.bubbleR * H;
    joint.bubbles.forEach(function (b) {
        if (b.popped) return;
        if (Math.abs(G.arc - b.arc) < r) {
            if (G.speed <= K.speedSlow) {
                b.popped = true;
                G.bubblesPopped++;
                var p = pointAt(joint.path, b.arc);
                G.pops.push({ x: p.x, y: p.y, t: 0 });
                toast("Cloque chassée !", 'good');
                Audio_.pop();
            }
        } else if (G.arc > b.arc + r && !b.missed) {
            b.missed = true;
            toast("Cloque ratée…", 'warn');
        }
    });
}

function checkCorners(joint) {
    var win = K.cornerWin * H;
    joint.path.corners.forEach(function (cArc, i) {
        if (joint.cornersDone[i] !== null) return;
        if (G.arc > cArc + win * 0.4) {
            var clean = G.speed <= K.cornerSpeed;
            joint.cornersDone[i] = clean;
            if (clean) { G.cornersClean++; toast("Angle propre", 'good'); }
            else { toast("La bande plisse dans l'angle", 'warn'); }
        }
    });
}

function completeJoint(joint) {
    joint.done = true;
    G.current++;
    G.arc = 0;
    if (G.current >= G.joints.length) {
        finish(true);
    } else {
        toast("Joint fini — au suivant", 'good');
        Audio_.good();
        updateJointLabel();
    }
}

/* --------------------------------------------------------------
   Rendu
   -------------------------------------------------------------- */

function draw() {
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    if (decor) ctx.drawImage(decor, 0, 0, W, H);

    // bavures d'enduit sur la plaque
    G.marks.forEach(function (m) {
        ctx.fillStyle = 'rgba(246,244,239,' + m.a + ')';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, 6.2832);
        ctx.fill();
    });

    // bandes posées
    G.joints.forEach(function (j, i) {
        drawTrail(j.trail);
        if (i === G.current && !G.finished) drawBubbles(j);
        else if (i > G.current) drawBubbles(j);
    });

    // repères du joint en cours
    if (!G.finished && G.joints[G.current]) drawMarkers(G.joints[G.current]);

    // cloques qui éclatent
    G.pops.forEach(function (p) {
        var t = p.t / 0.5;
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - t) + ')';
        ctx.lineWidth = 2.5 * (1 - t) + 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, K.bubbleR * H * (0.5 + t * 1.6), 0, 6.2832);
        ctx.stroke();
    });

    // le couteau à enduire
    if (G.dragging && G.finger && !G.finished) drawKnife(G.finger.x, G.finger.y);
}

function drawTrail(tr) {
    if (tr.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ombre portée du bourrelet
    ctx.strokeStyle = 'rgba(150,143,130,.28)';
    for (var pass = 0; pass < 2; pass++) {
        if (pass === 1) ctx.strokeStyle = '#f6f4ef';
        for (var i = 1; i < tr.length; i++) {
            var a = tr[i - 1], b = tr[i];
            ctx.lineWidth = (pass === 0 ? b.w * 1.12 : b.w);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y + (pass === 0 ? b.w * 0.12 : 0));
            ctx.lineTo(b.x, b.y + (pass === 0 ? b.w * 0.12 : 0));
            ctx.stroke();
        }
    }

    // trace du couteau au centre de la bande
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    for (var k = 1; k < tr.length; k++) {
        ctx.lineWidth = Math.max(1, tr[k].w * 0.2);
        ctx.beginPath();
        ctx.moveTo(tr[k - 1].x, tr[k - 1].y);
        ctx.lineTo(tr[k].x, tr[k].y);
        ctx.stroke();
    }
}

function drawBubbles(j) {
    j.bubbles.forEach(function (b) {
        if (b.popped) return;
        var p = pointAt(j.path, b.arc);
        var r = K.bubbleR * H * 0.62;
        var g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
        g.addColorStop(0, 'rgba(255,255,255,.95)');
        g.addColorStop(1, 'rgba(176,168,152,.85)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, 6.2832);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,112,98,.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
    });
}

function drawMarkers(j) {
    var start = pointAt(j.path, G.arc);
    var end = pointAt(j.path, j.path.total);
    var pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);

    // point de départ / de reprise
    ctx.fillStyle = 'rgba(63,185,107,.22)';
    ctx.beginPath();
    ctx.arc(start.x, start.y, H * (0.026 + 0.012 * pulse), 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = '#3fb96b';
    ctx.beginPath();
    ctx.arc(start.x, start.y, H * 0.013, 0, 6.2832);
    ctx.fill();

    // fin du joint
    ctx.strokeStyle = 'rgba(47,127,214,.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(end.x, end.y, H * 0.016, 0, 6.2832);
    ctx.stroke();
}

function drawKnife(x, y) {
    ctx.save();
    ctx.translate(x, y);
    var w = H * 0.055, h = H * 0.018;
    ctx.fillStyle = 'rgba(40,44,50,.9)';
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(w * 0.32, -h);
    ctx.lineTo(-w * 0.32, -h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(214,210,202,.95)';
    ctx.fillRect(-w / 2, -1.5, w, 3);
    ctx.restore();
}

/* --------------------------------------------------------------
   Jauges & messages
   -------------------------------------------------------------- */

var elProgress = $('#g-progress'), elStraight = $('#g-straight');
var elSpeed = $('#g-speed'), elSpeedHint = $('#speed-hint');
var elTimer = $('#hud-timer'), elToast = $('#toast');

function updateGauges() {
    var joint = G.joints[G.current];
    var jointsDone = G.current;
    var frac = joint ? (G.arc / joint.path.total) : 1;
    var overall = (jointsDone + (joint ? frac : 0)) / G.joints.length;
    elProgress.style.width = (overall * 100).toFixed(1) + '%';

    var straight = G.wLength > 0 ? G.wQuality / G.wLength : 1;
    elStraight.style.width = (straight * 100).toFixed(1) + '%';
    elStraight.className = straight > 0.8 ? 'g-good' : (straight > 0.55 ? 'g-mid' : 'g-bad');

    var sp = G.speed;
    elSpeed.style.left = clamp(sp / K.speedDisplay, 0, 1) * 100 + '%';

    var hint = '—', cls = '';
    if (!G.dragging) { hint = 'Couteau levé'; }
    else if (G.offTrack) { hint = 'Hors joint'; cls = 'h-bad'; }
    else if (sp < 0.05) { hint = 'Trop lent, ça charge'; cls = 'h-warn'; }
    else if (sp < K.speedMinOk) { hint = 'Bourrelet'; cls = 'h-warn'; }
    else if (sp <= K.speedMaxOk) { hint = 'Nickel'; cls = 'h-good'; }
    else { hint = 'Trop vite, ça manque'; cls = 'h-bad'; }
    elSpeedHint.textContent = hint;
    elSpeedHint.className = 'gauge-hint ' + cls;

    elTimer.textContent = G.timeLeft.toFixed(1);
    elTimer.className = 'hud-timer' + (G.timeLeft <= 5 ? ' is-urgent' : '');
}

function toast(msg, kind) {
    elToast.textContent = msg;
    elToast.className = 'toast is-show t-' + (kind || 'good');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
        elToast.className = 'toast';
    }, 900);
}

function updateJointLabel() {
    $('#hud-joint').textContent = 'Joint ' +
        Math.min(G.current + 1, G.joints.length) + '/' + G.joints.length;
}

/* --------------------------------------------------------------
   Saisie
   -------------------------------------------------------------- */

function canvasPos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener('pointerdown', function (e) {
    if (!G || G.finished) return;
    e.preventDefault();
    Audio_.init();
    Audio_.resume();

    var p = canvasPos(e);
    var joint = G.joints[G.current];
    if (!joint) return;

    var startPt = pointAt(joint.path, G.arc);
    var d = Math.hypot(p.x - startPt.x, p.y - startPt.y);
    if (d > H * 0.09) {
        toast("Repars du point vert", 'warn');
        return;
    }

    canvas.setPointerCapture(e.pointerId);
    G.dragging = true;
    G.finger = p;
    $('#start-hint').classList.add('is-hidden');
});

canvas.addEventListener('pointermove', function (e) {
    if (!G || !G.dragging) return;
    e.preventDefault();
    G.finger = canvasPos(e);
});

function endDrag() {
    if (!G || !G.dragging) return;
    G.dragging = false;
    G.finger = null;
    Audio_.silence();
    var joint = G.joints[G.current];
    // lever le couteau au milieu d'un joint, c'est une reprise
    if (joint && G.arc > H * 0.02 && G.arc < joint.path.total - 0.5 && !G.finished) {
        G.reprises++;
        toast("Reprise — le couteau s'est levé", 'warn');
    }
    updateGauges();
}

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

/* --------------------------------------------------------------
   Fin de chantier & notation
   -------------------------------------------------------------- */

function finish(completed) {
    if (G.finished) return;
    G.finished = true;
    G.dragging = false;
    G.finger = null;
    Audio_.silence();
    cancelAnimationFrame(rafId);
    draw();

    var totalLen = G.joints.reduce(function (a, j) { return a + j.path.total; }, 0);
    var doneLen = 0;
    G.joints.forEach(function (j, i) {
        if (i < G.current) doneLen += j.path.total;
        else if (i === G.current) doneLen += G.arc;
    });
    var coverage = totalLen > 0 ? clamp(doneLen / totalLen, 0, 1) : 0;
    var straight = G.wLength > 0 ? clamp(G.wQuality / G.wLength, 0, 1) : 0;
    var speed = G.wLength > 0 ? clamp(G.wSpeed / G.wLength, 0, 1) : 0;

    var finitionParts = [];
    if (G.bubblesTotal > 0) finitionParts.push(G.bubblesPopped / G.bubblesTotal);
    if (G.cornersTotal > 0) finitionParts.push(G.cornersClean / G.cornersTotal);
    var finition = finitionParts.length
        ? finitionParts.reduce(function (a, b) { return a + b; }, 0) / finitionParts.length
        : 1;

    // 32 + 26 + 18 + 18 + 6 de bonus temps = 100 au maximum
    var pCover = coverage * 32;
    var pStraight = straight * coverage * 26;
    var pSpeed = speed * coverage * 18;
    var pFinition = finition * 18;
    var mSplat = -Math.min(G.splats * 1.5, 12);
    var mReprise = -Math.min(G.reprises * 3, 12);
    var bTime = completed ? clamp(G.timeLeft / G.lvl.time, 0, 1) * 6 : 0;

    var score = Math.round(clamp(
        pCover + pStraight + pSpeed + pFinition + mSplat + mReprise + bTime, 0, 100));

    var stars = score >= STAR_3 ? 3 : (score >= STAR_2 ? 2 : (score >= STAR_1 ? 1 : 0));
    if (stars > (save.stars[G.index] || 0)) { save.stars[G.index] = stars; persist(); }

    showResult({
        completed: completed, score: score, stars: stars,
        lines: [
            ['Longueur bandée', Math.round(coverage * 100) + ' %', coverage >= 0.999 ? 'pos' : 'neg'],
            ['Rectitude de la bande', Math.round(straight * 100) + ' %', straight >= 0.8 ? 'pos' : ''],
            ['Régularité du geste', Math.round(speed * 100) + ' %', speed >= 0.8 ? 'pos' : ''],
            ['Cloques chassées', G.bubblesPopped + '/' + G.bubblesTotal,
                (G.bubblesTotal && G.bubblesPopped === G.bubblesTotal) ? 'pos' : (G.bubblesTotal ? 'neg' : '')],
            ['Angles propres', G.cornersTotal ? (G.cornersClean + '/' + G.cornersTotal) : '—',
                (G.cornersTotal && G.cornersClean === G.cornersTotal) ? 'pos' : (G.cornersTotal ? 'neg' : '')],
            ['Bavures sur la plaque', G.splats ? '−' + Math.min(G.splats * 1.5, 12).toFixed(1) : '0', G.splats ? 'neg' : 'pos'],
            ['Reprises', G.reprises ? '−' + Math.min(G.reprises * 3, 12) : '0', G.reprises ? 'neg' : 'pos'],
            ['Bonus temps', '+' + bTime.toFixed(1), bTime > 0 ? 'pos' : '']
        ]
    });
}

var TITRES = [
    "Faut tout refaire",
    "Ça passera au ponçage",
    "Du propre",
    "Travail d'artiste"
];

var CITATIONS = [
    "Le chef a regardé le mur, il a rien dit. Il est parti chercher la disqueuse.",
    "C'est rattrapable. Deux passes d'enduit, un bon ponçage, et on n'en parle plus.",
    "Joint droit, pas de bourrelet. Le peintre te dira merci.",
    "Là, tu bandes comme on bandait avant. Chapeau."
];

function showResult(r) {
    $('#result-kicker').textContent = r.completed
        ? 'Chantier livré' : 'Temps écoulé';
    $('#result-title').textContent = TITRES[r.stars];
    $('#result-quote').textContent = CITATIONS[r.stars];
    $('#result-score').textContent = r.score;

    var starsEl = $('#result-stars');
    starsEl.innerHTML = '';
    for (var i = 0; i < 3; i++) {
        var s = document.createElement('span');
        s.textContent = '★';
        if (i < r.stars) s.className = 'on';
        starsEl.appendChild(s);
    }

    var ul = $('#result-lines');
    ul.innerHTML = '';
    r.lines.forEach(function (l) {
        var li = document.createElement('li');
        li.className = l[2] || '';
        li.innerHTML = '<span></span><b></b>';
        li.firstChild.textContent = l[0];
        li.lastChild.textContent = l[1];
        ul.appendChild(li);
    });

    $('#btn-next').disabled = (G.index >= LEVELS.length - 1) || r.stars < 1;
    $('#btn-next').textContent = (G.index >= LEVELS.length - 1)
        ? "Plus de chantier" : "Chantier suivant";

    if (r.stars >= 2) Audio_.fanfare();
    else if (r.stars === 1) Audio_.good();
    else Audio_.bad();

    showScreen('result');
}

/* --------------------------------------------------------------
   Navigation entre écrans
   -------------------------------------------------------------- */

function showScreen(name) {
    ['menu', 'levels', 'help', 'game', 'result'].forEach(function (n) {
        $('#screen-' + n).classList.toggle('is-active', n === name);
    });
    if (name === 'menu') refreshMenu();
    if (name === 'levels') buildLevelList();
    if (name === 'game') { requestAnimationFrame(resize); }
}

function refreshMenu() {
    $('#menu-stars').textContent = totalStars();
    $('#menu-stars-max').textContent = LEVELS.length * 3;
    $('#levels-stars').textContent = totalStars();
}

function buildLevelList() {
    var list = $('#level-list');
    list.innerHTML = '';
    $('#levels-stars').textContent = totalStars();

    LEVELS.forEach(function (lvl, i) {
        var open = isUnlocked(i);
        var got = save.stars[i] || 0;
        var card = document.createElement('button');
        card.className = 'level-card' + (open ? '' : ' is-locked');
        card.innerHTML =
            '<span class="level-num"></span>' +
            '<span class="level-info">' +
                '<span class="level-name"></span>' +
                '<span class="level-desc"></span>' +
            '</span>' +
            '<span class="level-stars"></span>';
        card.querySelector('.level-num').textContent = open ? (i + 1) : '🔒';
        card.querySelector('.level-name').textContent = lvl.name;
        card.querySelector('.level-desc').textContent = open
            ? lvl.desc : "Finis d'abord le chantier précédent";
        var st = card.querySelector('.level-stars');
        for (var k = 0; k < 3; k++) {
            var s = document.createElement('span');
            s.textContent = '★';
            if (k < got) s.className = 'on';
            st.appendChild(s);
        }
        card.addEventListener('click', function () { if (open) launch(i); });
        list.appendChild(card);
    });
}

function launch(i) {
    showScreen('game');
    requestAnimationFrame(function () {
        resize();
        newGame(i);
        $('#hud-name').textContent = (i + 1) + '. ' + LEVELS[i].name;
        updateJointLabel();
        $('#start-hint').classList.remove('is-hidden');
        $('#start-hint').textContent = LEVELS[i].joints[0].pts.length > 2
            ? "Pose le doigt sur le point vert — attention aux angles"
            : "Pose le doigt sur le point vert";
        elToast.className = 'toast';
        updateGauges();
        draw();
        startLoop();
    });
}

function nextUnplayedLevel() {
    for (var i = 0; i < LEVELS.length; i++) {
        if (isUnlocked(i) && !(save.stars[i] >= 1)) return i;
    }
    for (var j = LEVELS.length - 1; j >= 0; j--) { if (isUnlocked(j)) return j; }
    return 0;
}

/* --------------------------------------------------------------
   Câblage de l'interface
   -------------------------------------------------------------- */

$('#btn-play').addEventListener('click', function () { launch(nextUnplayedLevel()); });
$('#btn-levels').addEventListener('click', function () { showScreen('levels'); });
$('#btn-help').addEventListener('click', function () { showScreen('help'); });

Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (b) {
    b.addEventListener('click', function () { showScreen(b.getAttribute('data-back')); });
});

$('#btn-quit').addEventListener('click', function () {
    cancelAnimationFrame(rafId);
    Audio_.silence();
    if (G) G.finished = true;
    showScreen('levels');
});

$('#btn-retry').addEventListener('click', function () { launch(G.index); });
$('#btn-next').addEventListener('click', function () {
    if (G.index < LEVELS.length - 1) launch(G.index + 1);
});
$('#btn-result-menu').addEventListener('click', function () { showScreen('levels'); });

var btnSound = $('#btn-sound');
function paintSound() { btnSound.classList.toggle('is-off', !save.sound); }
btnSound.addEventListener('click', function () {
    save.sound = !save.sound;
    persist();
    paintSound();
    if (save.sound) { Audio_.init(); Audio_.resume(); Audio_.good(); }
    else Audio_.silence();
});

window.addEventListener('resize', function () {
    clearTimeout(window.__bandeurResize);
    window.__bandeurResize = setTimeout(resize, 120);
});
window.addEventListener('orientationchange', function () { setTimeout(resize, 250); });

document.addEventListener('visibilitychange', function () {
    if (document.hidden) { Audio_.silence(); if (G) G.dragging = false; }
});

// Pas de scroll élastique par-dessus le mur
document.addEventListener('touchmove', function (e) {
    if ($('#screen-game').classList.contains('is-active')) e.preventDefault();
}, { passive: false });

/* --------------------------------------------------------------
   Démarrage
   -------------------------------------------------------------- */

loadSave();
paintSound();
refreshMenu();
showScreen('menu');

})();
