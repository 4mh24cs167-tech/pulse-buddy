const fs = require('fs');
let html = fs.readFileSync('www/overlay.html', 'utf8');

// I will just replace the whole `<script>` tag.
const startScript = html.indexOf('<script>');
const newScript = `
<script>
const viewer = window.Buddy3D.createViewer();
window.Sprites = {
    draw: (container, id, state) => viewer.addInstance(container, id, state),
    update: (inst, state) => viewer.setInstanceState(inst, state),
    remove: (inst) => viewer.removeInstance(inst)
};

const $ = s => document.querySelector(s);
const W = innerWidth, H = innerHeight;
let cur, buddyInst = null;
let currentAnimFrame = null;

// Allow click-through on body and canvas
document.body.style.pointerEvents = 'none';
document.querySelectorAll('.hit').forEach(e => {
    e.style.pointerEvents = 'auto';
    e.onmouseenter = () => api.ignore(false);
    e.onmouseleave = () => api.ignore(true);
});
$('canvas')?.setAttribute('style', 'pointer-events:none!important');

let ac;
function beep() {
    if(!cur.sound) return;
    try {
        ac = ac || new AudioContext();
        [660, 880].forEach((f, i) => {
            const o = ac.createOscillator(), g = ac.createGain();
            o.type = 'sine'; o.frequency.value = f;
            o.connect(g); g.connect(ac.destination);
            const t = ac.currentTime + i * 0.15;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.2, t + 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            o.start(t); o.stop(t + 0.35);
        });
    } catch(e) {}
}

function typeMessage(text, cb) {
    const el = $('#msg');
    el.style.display = 'block';
    el.textContent = '';
    el.classList.add('typing');
    let i = 0;
    const iv = setInterval(() => {
        el.textContent += text[i++];
        if(i >= text.length) {
            clearInterval(iv);
            el.classList.remove('typing');
            if(cb) cb();
        }
    }, 30);
}

const cCtx = $('#confetti').getContext('2d');
$('#confetti').width = W; $('#confetti').height = H;
let particles = [];
function fireConfetti() {
    for(let i=0;i<100;i++){
        particles.push({
            x: W - 240, y: H - 120,
            vx: (Math.random()-0.5)*15, vy: (Math.random()-1)*15 - 5,
            c: ['#43e97b','#38f9d7','#ff9a9e','#fecfef'][Math.floor(Math.random()*4)],
            s: Math.random()*8+4, r: Math.random()*Math.PI*2, rv: (Math.random()-0.5)*0.2
        });
    }
}
function loopConfetti() {
    if(currentAnimFrame) cancelAnimationFrame(currentAnimFrame);
    currentAnimFrame = requestAnimationFrame(loopConfetti);
    if(!particles.length) return;
    cCtx.clearRect(0,0,W,H);
    particles.forEach((p,i) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.r += p.rv;
        cCtx.save();
        cCtx.translate(p.x, p.y); cCtx.rotate(p.r);
        cCtx.fillStyle = p.c; cCtx.fillRect(-p.s/2, -p.s/2, p.s, p.s);
        cCtx.restore();
        if(p.y > H) particles.splice(i,1);
    });
}
loopConfetti();

function stopBuddy() {
    if (buddyInst) {
        Sprites.remove(buddyInst);
        buddyInst = null;
    }
}

function walkTo(endX, cb) {
    Sprites.update(buddyInst, 'WALK');
    const startX = buddyInst.model.position.x;
    const dist = endX - startX;
    const dir = Math.sign(dist);
    buddyInst.model.rotation.y = dir > 0 ? Math.PI/2 : -Math.PI/2;
    
    let time = 0;
    const dur = Math.abs(dist) / 2.0; // 2 units per sec
    const iv = setInterval(() => {
        time += 0.016;
        buddyInst.model.position.x = startX + dir * Math.min(time * 2.0, Math.abs(dist));
        if (time >= dur) {
            clearInterval(iv);
            buddyInst.model.position.x = endX;
            cb();
        }
    }, 16);
}

function animateEntrance(ent, done) {
    const r = cur.r;
    buddyInst = Sprites.draw($('#buddy'), r.buddy, 'WALK');
    
    // Set 3D target X
    const targetX = 2.0; // Right side of screen in 3D world
    
    if (ent === 'parachute') {
        buddyInst.model.position.set(targetX, 5, 0);
        Sprites.update(buddyInst, 'IDLE');
        let y = 5;
        const iv = setInterval(() => {
            y -= 0.05;
            buddyInst.model.position.y = Math.max(0, y);
            if (y <= 0) {
                clearInterval(iv);
                done();
            }
        }, 16);
    } else {
        buddyInst.model.position.set(-4, 0, 0);
        walkTo(targetX, () => {
            buddyInst.model.rotation.y = 0; // Turn to user
            Sprites.update(buddyInst, 'IDLE');
            done();
        });
    }
}

api.onFire(d => {
    cur = d;
    const r = d.r;
    $('#yes').textContent = r.yes || 'Yes, done';
    
    // Clear old instances
    stopBuddy();
    $('#msg').style.display = 'none';
    $('#btns').style.display = 'none';
    
    animateEntrance(r.ent || 'walk', () => {
        Sprites.update(buddyInst, 'HAPPY'); // Or talk, happy represents engaging
        
        // Static bubble DOM positions for right-side buddy
        const bbl = $('#msg');
        bbl.style.right = '250px';
        bbl.style.bottom = '190px';
        $('#btns').style.right = '250px';
        $('#btns').style.bottom = '130px';
        
        typeMessage(r.message || r.title, () => {
            $('#btns').style.display = 'flex';
            beep();
        });
    });
});

function leave(state) {
    $('#msg').style.display = $('#btns').style.display = $('#ring').style.display = 'none';
    if(buddyInst) {
        buddyInst.model.rotation.y = Math.PI/2;
        walkTo(5, () => {
            stopBuddy();
            api.closeOverlay();
        });
    } else {
        api.closeOverlay();
    }
}

$('#yes').onclick = async () => {
    const a = await api.answer(cur.r.id, 'done');
    $('#btns').style.display = 'none';
    
    Sprites.update(buddyInst, 'CELEBRATE');
    fireConfetti();
    
    $('#msg').textContent = '';
    typeMessage('Good job!', () => {
        $('#ring').style.display = 'block';
        $('#ring').style.right = '300px';
        $('#ring').style.bottom = '150px';
        
        $('#cnt').textContent = a.count + '/' + a.goal;
        requestAnimationFrame(() => $('#arc').style.strokeDashoffset = 301.6 * (1 - Math.min(1, a.count / a.goal)));
        setTimeout(() => leave('walkAway'), 3200);
    });
};

$('#snz').onclick = async () => {
    await api.answer(cur.r.id, 'snooze');
    $('#btns').style.display = 'none';
    $('#msg').style.display = 'none';
    Sprites.update(buddyInst, 'FOCUSED');
    setTimeout(() => leave('walkAway'), 1500);
};
</script>
`;

html = html.substring(0, startScript) + newScript;
fs.writeFileSync('www/overlay.html', html, 'utf8');
