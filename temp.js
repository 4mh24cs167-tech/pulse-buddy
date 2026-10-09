
var catalogFallback = window.BuddyCatalog || [];


let viewer = null;
let Configs = null;
let THREE = null;



function init3DBackground() {
  try {
    if(!window.Buddy3D || !window.Buddy3D.THREE) return;
    const THREE = window.Buddy3D.THREE;
    // Crazy 3D Background
    const bgCanvas = document.createElement('canvas');
    bgCanvas.style.position = 'fixed';
    bgCanvas.style.top = '0'; bgCanvas.style.left = '0'; bgCanvas.style.zIndex = '0'; bgCanvas.style.pointerEvents = 'none';
    document.body.prepend(bgCanvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({canvas: bgCanvas, alpha: true, antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    const geom = new THREE.BufferGeometry();
    const pts = [];
    for(let i=0; i<1000; i++) pts.push((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20);
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.PointsMaterial({color: 0x43e97b, size: 0.05, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending});
    const stars = new THREE.Points(geom, mat);
    scene.add(stars);
    camera.position.z = 5;
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', e => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    function animBG() {
      requestAnimationFrame(animBG);
      stars.rotation.x += 0.001; stars.rotation.y += 0.002;
      camera.position.x += (mouseX * 2 - camera.position.x) * 0.05;
      camera.position.y += (mouseY * 2 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    }
    animBG();
  } catch(e) { console.error("BG Render failed", e); }
}

// 3D Tilt Effect for panels
function addTilt(el) {
  el.style.transformStyle = 'preserve-3d';
  el.style.transition = 'transform 0.1s';
  el.addEventListener('mousemove', e => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const xc = rect.width/2; const yc = rect.height/2;
    const dx = x - xc; const dy = y - yc;
    el.style.transform = `perspective(1000px) rotateY(\${dx/20}deg) rotateX(\${-dy/20}deg) scale3d(1.02,1.02,1.02)`;
  });
  el.addEventListener('mouseleave', () => { el.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)'; });
}
document.querySelectorAll('.panel, .rem-card').forEach(addTilt);
const observer = new MutationObserver(() => document.querySelectorAll('.panel:not(.tilted), .rem-card:not(.tilted)').forEach(e => { e.classList.add('tilted'); addTilt(e); }));
observer.observe(document.body, {childList: true, subtree: true});

const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s), uid=()=>Math.random().toString(36).slice(2,9);
let S, ed=null, buddy=0;
let favs = new Set();
let customBuddies = [
    'build/realistic/man.jpg',
    'build/realistic/woman.jpg',
    'build/realistic/car.jpg',
    'build/realistic/dog.jpg'
];
let nextBuddyInst = null;

const TPL=[['Drink water','Time to drink water to keep your skin glowing!','Yes, I drank','interval',45,8,'#59c3ff',3],['Stretch','Stand up and stretch your back!','Done stretching','interval',60,6,'#ffb547',12],['Rest your eyes','Look 20 feet away for 20 seconds!','Done','interval',20,10,'#5ee0b0',21],['Take medicine','Time for your medicine!','Taken','daily','09:00, 21:00',2,'#ff7a7a',30],['Walk','Take a short walk, you deserve it!','Yes, walked','interval',90,4,'#b9a6ff',41]];
const save=async()=>{await api.save(S);draw()};
function fmt(ms){const s=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?h+'h '+m+'m':m+'m '+s%60+'s'}

// Tab Navigation
$$('.sidebar button[data-tab]').forEach(b => {
    b.addEventListener('click', (e) => {
          const target = e.currentTarget;
          $$('.sidebar button').forEach(x => x.classList.remove('active'));
          $$('.tab-view').forEach(x => x.classList.remove('active'));
          target.classList.add('active');
          $('#tab-' + target.dataset.tab).classList.add('active');
          if(target.dataset.tab === 'buddies') renderGallery();
      });
});

// Custom Buddy Creator
if ($('#btnSaveCustomBuddy')) {
    $('#btnSaveCustomBuddy').onclick = () => {
        const fileInput = $('#customBuddyUpload');
        const nameInput = $('#customBuddyName');
        if(!fileInput.files.length) return alert("Please select an image");
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            let b64 = e.target.result;
            // Write physical local asset to disk via AssetStore rather than state
            if (window.api && window.api.saveAsset) {
                b64 = await window.api.saveAsset('c_' + Date.now(), b64);
            }
            const b = { id: 'c_' + Date.now(), name: nameInput.value || 'Custom Buddy', category: 'custom', asset: b64 };
            S.buddies = S.buddies || [];
            S.buddies.push(b);
            await save();
            alert("Custom Buddy saved to physical storage successfully!");
            renderGallery();
        };
        reader.readAsDataURL(file);
    };
}
if ($('#btnExportBuddies')) {
    $('#btnExportBuddies').onclick = async () => {
        if (!S.buddies || !S.buddies.length) return alert("No custom buddies to export.");
        // Pack manifest + metadata into .pbuddy JSON
        const pkg = { version: 1, type: "PulseBuddyPackage", buddies: S.buddies };
        const blob = new Blob([JSON.stringify(pkg)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MyCustomBuddies_${Date.now()}.pbuddy`;
        a.click();
        URL.revokeObjectURL(url);
    };
    $('#btnImportBuddies').onclick = () => $('#importBuddyUpload').click();
    $('#importBuddyUpload').onchange = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const pkg = JSON.parse(ev.target.result);
                if (pkg.type !== "PulseBuddyPackage" || !pkg.buddies) throw new Error("Invalid .pbuddy format");
                S.buddies = S.buddies || [];
                // Prevent duplicate IDs/path traversal
                pkg.buddies.forEach(b => {
                    b.id = 'c_' + Date.now() + Math.random().toString(36).substr(2,5);
                    b.name = (b.name || 'Imported').replace(/[^a-zA-Z0-9 _-]/g, '');
                    S.buddies.push(b);
                });
                await save();
                alert(`Successfully imported ${pkg.buddies.length} buddies!`);
                renderGallery();
            } catch(err) {
                alert("Failed to import .pbuddy file: " + err.message);
            }
        };
        reader.readAsText(file);
    };
}

// Greeting
const hr = new Date().getHours();
$('#greeting').textContent = hr < 12 ? 'Morning' : hr < 18 ? 'Afternoon' : 'Evening';

function thumb(r,k){
 const div=document.createElement('div');
 div.style.width=k*16+'px'; div.style.height=k*24+'px';
 if(typeof r.buddy==='string'){
  const i=new Image();i.style.width='100%';i.style.height='100%';i.style.objectFit='contain';
  i.src=r.buddy;div.append(i);
 }else{
  const res=window.Sprites.draw(div,r.buddy,'idle');
  if(res) {
      window.activeThumbs.push(res);
      return res.container; 
  }
 }
 return div;
}

function when(r){return r.mode==='interval'?'Every '+r.every+' min':r.mode==='daily'?'Daily '+r.times.join(', '):'Once'}
function streak(){const d=new Set(S.reminders.flatMap(r=>(r.log||[]).map(t=>new Date(t).toDateString())));let n=0,x=new Date();if(!d.has(x.toDateString()))x.setDate(x.getDate()-1);while(d.has(x.toDateString())){n++;x.setDate(x.getDate()-1)}return n}

function updateToday() {
    let comps = 0, acts = 0;
    S.reminders.forEach(r => { comps += Core.today(r); if(r.active) acts++; });
    $('#tComp').textContent = comps;
    $('#tAct').textContent = acts;
    $('#tStrk').textContent = streak();
    
    // Overall progress
    let goal = S.reminders.reduce((a,r) => a + (r.goal||1), 0) || 1;
    let pct = Math.min(100, Math.round((comps/goal)*100));
    $('#tPct').textContent = pct + '%';
    $('#tRing').style.strokeDashoffset = 314.15 * (1 - pct/100);

    // Next reminder countdown
    const activeRems = S.reminders.filter(r => r.active && r.next);
    activeRems.sort((a,b) => a.next - b.next);
    const nextR = activeRems[0];
    
    if(nextR) {
        $('#tNextLbl').textContent = nextR.title;
        const diff = Math.max(0, nextR.next - Date.now());
        const s = Math.ceil(diff/1000), h = Math.floor(s/3600), m = Math.floor(s%3600/60), sc = s%60;
        $('#tNextTime').textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sc.toString().padStart(2,'0')}`;
        
        if(!nextBuddyInst || nextBuddyInst.id_or_config !== nextR.buddy) {
            $('#tNextBuddy').innerHTML = '';
            nextBuddyInst = window.Sprites.draw($('#tNextBuddy'), nextR.buddy, 'idle');
            nextBuddyInst.id_or_config = nextR.buddy;
        }
    } else {
        $('#tNextLbl').textContent = 'No active reminders';
        $('#tNextTime').textContent = '--:--:--';
        $('#tNextBuddy').innerHTML = '';
        nextBuddyInst = null;
    }
}

window.activeThumbs = window.activeThumbs || [];
function draw(){
 if(window.activeThumbs) {
     window.activeThumbs.forEach(inst => window.Sprites.remove(inst));
     window.activeThumbs = [];
 }
 const L=$('#list');L.innerHTML='';
 if(!S.reminders.length) L.innerHTML='<div class="panel" style="text-align:center; color:var(--text-mut)">No reminders yet. Create one to get started!</div>';
 
 S.reminders.forEach(r=>{
  const d=document.createElement('div');
  d.className='rem-card'+(r.active?'':' off');
  
  const th = document.createElement('div'); th.className='rem-thumb'; th.append(thumb(r,3));
  d.append(th);
  
  const i=document.createElement('div');i.className='rem-info';
  i.innerHTML=`<div class="rem-title">${r.title.replace(/</g,'&lt;')}</div><div class="rem-meta">${when(r)} • ${Core.today(r)}/${r.goal||1} today${r.active&&r.next?' • Next in '+fmt(r.next-Date.now()):''}</div>`;
  d.append(i);
  
  const acts=document.createElement('div'); acts.className='rem-actions';
  const mk=(t,f)=>{const b=document.createElement('button');b.className='btn-ghost';b.textContent=t;b.onclick=f;acts.append(b);return b};
  mk('Test',()=>api.test(r)); mk('Edit',()=>open(r)); mk('Del',async()=>{
      await api.deleteReminder(r.id);
      S.reminders=S.reminders.filter(x=>x!==r);
      draw();
  });
  
  const sw=document.createElement('div'); sw.className='sw'+(r.active?' on':'');
  sw.onclick=async()=>{
      r.active=!r.active;
      if(r.active)r.next=Core.next(r,Date.now());
      await api.updateReminder(r.id, { active: r.active, next: r.next });
      draw();
  };
  acts.append(sw);
  
  d.append(acts);
  L.append(d);
 });
 
 // Settings update
 $('#oAuto').className = 'sw' + (S.settings.autostart ? ' on' : '');
 $('#oSnd').className = 'sw' + (S.settings.sound ? ' on' : '');
 $('#oSnz').value = S.settings.snooze || 10;
 
 updateToday();
}

function bindSw(id, key) {
    $('#'+id).onclick = () => {
        S.settings[key] = !S.settings[key];
        $('#'+id).className = 'sw' + (S.settings[key] ? ' on' : '');
        api.setSetting(key, S.settings[key]);
    };
}

$('#oSnz').onchange = (e) => {
    S.settings.snooze = +e.target.value || 10;
    api.setSetting('snooze', S.settings.snooze);
};

function pick(b){
  buddy=b;
  [...$$('#bg button')].forEach(x=>{
      if(x.classList.contains('fav-btn')) return;
      x.classList.toggle('sel',x.dataset.b==String(JSON.stringify(b))||x.dataset.b==String(b));
  });
}

// Build dialog picker
window.BuddyCatalog.forEach(c => {
        const id = c.id;
        const btn = document.createElement('button');
        btn.dataset.b = id;
        btn.append(thumb({buddy:id}, 2.5));
        btn.onclick = () => pick(id);
        $('#bg').append(btn);
    });

$('#tpl').innerHTML=TPL.map((t,i)=>`<button class="chip" data-i="${i}">${t[0]}</button>`).join('');
$('#tpl').onclick=e=>{const t=TPL[e.target.dataset.i];if(!t)return;$('#fT').value=t[0];$('#fM').value=t[1];$('#fY').value=t[2];$('#fMode').value=t[3];(t[3]==='interval'?$('#fEv'):$('#fTi')).value=t[4];$('#fG').value=t[5];$('#fEnt').value='walk';pick(t[7]);mode()};
function mode(){const m=$('#fMode').value;$('#gI').hidden=m!=='interval';$('#gD').hidden=m!=='daily';$('#gO').hidden=m!=='once';$('#gH').hidden=m!=='interval'}$('#fMode').onchange=mode;
function open(r){ed=r;$('#dT').textContent=r?'Edit Reminder':'New Reminder';$('#fT').value=r?r.title:'';$('#fM').value=r?r.message:'';$('#fY').value=r?r.yes:'Done';$('#fG').value=r?r.goal:1;$('#fMode').value=r?r.mode:'interval';$('#fEv').value=r?r.every||60:60;$('#fTi').value=r&&r.times?r.times.join(', '):'09:00, 21:00';$('#fHs').value=r&&r.hs||'09:00';$('#fHe').value=r&&r.he||'22:00';$('#fEnt').value=r&&r.ent?r.ent:'walk';pick(r?r.buddy:0);mode();$('#dlg').showModal()}
$('#add').onclick=()=>open();$('#cx').onclick=()=>$('#dlg').close();

// Buddy Studio & Gallery
function getBuddyTypeStr(id) {
    if(typeof id === 'object') return id.species || 'custom';
    if(typeof id === 'string') return 'custom';
    if(id < 18) return 'human';
    if(id < 42) return 'animal';
    if(id < 54) return 'vehicle';
    if(id < 64) return 'robot';
    return 'fantasy';
}

function renderGallery(filter = 'all', search = '') {
    const list = [];
    // Authoritative catalog mapping
    if (window.BuddyCatalog) window.BuddyCatalog.forEach(c => list.push(c.id));
    // Add custom buddies only once
    const custom = (S && S.buddies) ? S.buddies : [];
    custom.forEach(c => list.push(c));
    
    $('#galContent').innerHTML = '';
    const q = search.toLowerCase();
    
    list.forEach(id => {
        let type = getBuddyTypeStr(id);
        let name = '';
        if (typeof id === 'object' && id.category) type = id.category;
        if (typeof id === 'object' && id.name) name = id.name.toLowerCase();
        
        const strId = typeof id === 'object' ? JSON.stringify(id) : String(id);
        const isFav = favs.has(strId);
        
        if(filter !== 'all' && filter !== 'fav' && filter !== type) return;
        if(filter === 'fav' && !isFav) return;
        if(q && !name.includes(q)) return;
        
        const b = document.createElement('button');
        b.dataset.b = strId;
        b.append(thumb({buddy:id}, 3));
        
        const f = document.createElement('button');
        f.className = 'fav-btn' + (isFav?' active':'');
        f.innerHTML = isFav ? '★' : '☆';
        f.onclick = (e) => { e.stopPropagation(); if(favs.has(strId)) favs.delete(strId); else favs.add(strId); renderGallery(filter, search); };
        b.append(f);
        
        $('#galContent').append(b);
    });
}

$$('#galTabs button').forEach(b => {
      b.addEventListener('click', (e) => {
          const target = e.currentTarget;
          $$('#galTabs button').forEach(x=>x.style.background='rgba(255,255,255,0.1)');
          target.style.background='rgba(255,255,255,0.2)';
          renderGallery(target.dataset.tab, $('#galSearch').value);
      });
});
$('#galSearch').oninput = (e) => {
    const activeTabBtn = [...$$('#galTabs button')].find(b=>b.style.background==='rgba(255, 255, 255, 0.2)');
    const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : 'all';
    renderGallery(activeTab, e.target.value);
};

let studioInst = null;
let currentConfig = { species:'human', skin:0, hairType:0, hair:0, shirt:0, pants:0, buildType:1, heightType:1 };

function initStudioOpts() {
    const pop = (id, arr, lbl) => {
        const el = $('#'+id); el.innerHTML = '';
        arr.forEach((v,i) => {
            const opt = document.createElement('option');
            opt.value = i; opt.textContent = lbl + ' ' + (i+1);
            el.appendChild(opt);
        });
    };
    pop('sSkin', Configs.skinTones, 'Tone');
    pop('sHairType', Array(12).fill(0), 'Style');
    pop('sHair', Configs.hairColors, 'Color');
    pop('sShirt', Configs.shirtColors, 'Color');
    pop('sPants', Configs.pantsColors, 'Color');
    pop('sAnimalColor', Configs.animalColors, 'Color');
    pop('sVehicleColor', Configs.vehicleColors, 'Color');
}

function updateStudioModel() {
    if(!studioInst) {
        studioInst = window.Sprites.draw($('#studioView'), currentConfig, 'studio');
    } else {
        window.Sprites.updateModel(studioInst, currentConfig);
    }
}

const openStudio = () => {
    $('#studioDlg').showModal();
    if(!studioInst) initStudioOpts();
    updateStudioModel();
};
$('#openStudioBtn').onclick = openStudio;
$('#openStudioBtnMain').onclick = openStudio;

$('#sSpecies').onchange = (e) => {
    currentConfig.species = e.target.value;
    $('#sHumanOpts').hidden = currentConfig.species !== 'human';
    $('#sAnimalOpts').hidden = currentConfig.species !== 'animal';
    $('#sVehicleOpts').hidden = currentConfig.species !== 'vehicle';
    if(currentConfig.species === 'animal') currentConfig.color = 0;
    if(currentConfig.species === 'vehicle') { currentConfig.type = 0; currentConfig.color = 0; }
    updateStudioModel();
};

if ($('#studioEmotions')) {
    $$('#studioEmotions .chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const emotion = e.currentTarget.dataset.emotion;
            if (studioInst) {
                if (window.Sprites && window.Sprites.update) {
                    window.Sprites.update(studioInst, emotion);
                }
                // Legacy EmotionEngine removed in favor of true 3D BuddyEngine behavior
            }
        });
    });
}

['sSkin','sHairType','sHair','sShirt','sPants','sAnimalColor','sVehicleType','sVehicleColor'].forEach(id => {
    $('#'+id).onchange = (e) => {
        const val = parseInt(e.target.value);
        if(id==='sSkin') currentConfig.skin = val;
        if(id==='sHairType') currentConfig.hairType = val;
        if(id==='sHair') currentConfig.hair = val;
        if(id==='sShirt') currentConfig.shirt = val;
        if(id==='sPants') currentConfig.pants = val;
        if(id==='sAnimalColor') currentConfig.color = val;
        if(id==='sVehicleType') currentConfig.type = val;
        if(id==='sVehicleColor') currentConfig.color = val;
        updateStudioModel();
    };
});

$('#sRnd').onclick = () => {
    const r = (m) => Math.floor(Math.random()*m);
    if(currentConfig.species === 'human') {
        currentConfig.skin = r(Configs.skinTones.length);
        currentConfig.hairType = r(12);
        currentConfig.hair = r(Configs.hairColors.length);
        currentConfig.shirt = r(Configs.shirtColors.length);
        currentConfig.pants = r(Configs.pantsColors.length);
        $('#sSkin').value = currentConfig.skin; $('#sHairType').value = currentConfig.hairType; $('#sHair').value = currentConfig.hair; $('#sShirt').value = currentConfig.shirt; $('#sPants').value = currentConfig.pants;
    } else if(currentConfig.species === 'animal') {
        currentConfig.color = r(Configs.animalColors.length); $('#sAnimalColor').value = currentConfig.color;
    } else if(currentConfig.species === 'vehicle') {
        currentConfig.type = r(3); currentConfig.color = r(Configs.vehicleColors.length);
        $('#sVehicleType').value = currentConfig.type; $('#sVehicleColor').value = currentConfig.color;
    } else if(currentConfig.species === 'robot') {
        currentConfig.type = r(3); currentConfig.color = r(4);
    } else {
        currentConfig.type = r(3); currentConfig.color = r(4);
    }
    updateStudioModel();
};

const addToPicker = (data) => {
    customBuddies.push(data);
    const btn = document.createElement('button');
    btn.dataset.b = JSON.stringify(data);
    btn.append(thumb({buddy:data}, 2.5));
    btn.onclick = () => pick(data);
    $('#bg').prepend(btn);
    pick(data);
    $('#studioDlg').close();
    renderGallery();
};

$('#sSave').onclick = () => addToPicker(JSON.parse(JSON.stringify(currentConfig)));

$('#up').onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const fr=new FileReader();
    fr.onload=async ()=>{
        const b64 = fr.result;
        const newId = 'c_' + uid();
        const assetId = await api.saveAsset(newId, b64);
        const buddyState = { id: newId, name: 'Custom Photo', asset: assetId, isPhoto: true };
        S.buddies = S.buddies || [];
        S.buddies.push(buddyState);
        await api.save(S);
        addToPicker(buddyState);
    };
    fr.readAsDataURL(f);
};

function build(){const t=$('#fT').value.trim();if(!t){$('#fT').focus();return null}const m=$('#fMode').value,r=ed||{id:uid(),log:[]};
 Object.assign(r,{title:t,message:$('#fM').value.trim()||t,yes:$('#fY').value||'Done',goal:+$('#fG').value||1,mode:m,buddy,active:true,ent:$('#fEnt').value});
 if(m==='interval'){r.every=Math.max(1,+$('#fEv').value||60);r.hs=$('#fHs').value;r.he=$('#fHe').value}
 if(m==='daily'){r.times=$('#fTi').value.split(',').map(s=>s.trim()).filter(s=>/^\d{1,2}:\d{2}$/.test(s));if(!r.times.length){alert('Use times like 09:00, 21:00');return null}}
 if(m==='once'){const x=new Date($('#fAt').value).getTime();if(!x||x<Date.now()){alert('Pick a future date and time');return null}r.next=x}else r.next=Core.next(r,Date.now());return r}
$('#sv').onclick=async()=>{
    const r=build();if(!r)return;
    if(!ed) {
        r.id = await api.createReminder(r);
        S.reminders.push(r);
    } else {
        await api.updateReminder(r.id, r);
        Object.assign(ed, r);
    }
    $('#dlg').close();
    draw();
};
$('#ts').onclick=()=>{const r=build();if(r)api.test({...r,id:'preview'})};
$('#pz').onclick=()=>{api.pause(60);alert('Paused for 1 hour. Use the tray menu to resume.')};

function bootstrap() {
    try {
        $$('dialog button:not([type="submit"])').forEach(b => {
            if(!b.hasAttribute('type')) b.setAttribute('type', 'button');
        });
        
        try {
            if (window.Buddy3D && window.Buddy3D.createViewer) {
                Configs = window.Buddy3D.Configs;
                viewer = window.Buddy3D.createViewer();
                THREE = window.Buddy3D.THREE;
                window.Sprites = {
                    draw: (container, id, state) => viewer.addInstance(container, id, state),
                    update: (inst, state) => viewer.setInstanceState(inst, state),
                    updateModel: (inst, config) => viewer.updateModel(inst, config),
                    remove: (inst) => viewer.removeInstance(inst)
                };
                init3DBackground();
            }
        } catch(e) {
            console.error("WebGL initialization failed:", e);
            const banner = document.createElement('div');
            banner.textContent = "3D rendering unavailable � 2D preview mode enabled.";
            banner.style.padding = '8px'; banner.style.background = 'rgba(255,100,100,0.2)';
            banner.style.textAlign = 'center';
            document.body.prepend(banner);
        }

        (async() => {

    S=await api.get();
    if(S.settings.autostart === undefined) S.settings.autostart = true;
    if(S.settings.sound === undefined) S.settings.sound = true;
    
    bindSw('oAuto', 'autostart');
    bindSw('oSnd', 'sound');
    
    $('#dlg').addEventListener('close', () => {
        if(nextBuddyInst) {
            window.Sprites.remove(nextBuddyInst);
            nextBuddyInst = null;
        }
    });
    
    $('#studioDlg').addEventListener('close', () => {
        if(studioInst) {
            window.Sprites.remove(studioInst);
            studioInst = null;
        }
    });
    
    draw();
    api.onRefresh(async()=>{S=await api.get();draw()});
    setInterval(updateToday,1000);

        })();
    } catch(err) {
        console.error("Bootstrap error:", err);
    }
}
window.addEventListener('DOMContentLoaded', bootstrap);

