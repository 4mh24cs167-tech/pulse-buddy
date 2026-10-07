import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MATERIALS = {};
function getMat(color, type='standard', roughness=0.7) {
    const key = `${type}_${color}_${roughness}`;
    if(MATERIALS[key]) return MATERIALS[key];
    if(type === 'physical') MATERIALS[key] = new THREE.MeshPhysicalMaterial({color, roughness, clearcoat:1.0, clearcoatRoughness:0.1});
    else MATERIALS[key] = new THREE.MeshStandardMaterial({color, roughness, metalness:0.1});
    return MATERIALS[key];
}

function R(seed) {
    return function() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };
}

const createBone = (name) => {
    const b = new THREE.Group();
    b.name = name;
    return b;
};

const skinTones = [0xffe0bd, 0xffcd94, 0xeac086, 0xc68642, 0x8d5524, 0x5c3311, 0x4a2a0d, 0x2e1807];
const hairColors = [0x222222, 0x4a2c14, 0xb89942, 0x8a2b19, 0xb0b0b0, 0x402c63, 0x256291, 0xcc2222];
const shirtColors = [0xc0392b, 0x0984e3, 0x10ac84, 0xff9f43, 0x8e44ad, 0x2c3e50, 0xffffff, 0xf1c40f];
const pantsColors = [0x111111, 0x2980b9, 0x7f8c8d, 0xbdc3c7, 0x8e44ad, 0x27ae60];
const animalColors = [0xe67e22, 0x95a5a6, 0xffffff, 0x34495e, 0x8d6e63, 0x4caf50];
const vehicleColors = [0xe74c3c, 0x3498db, 0xf1c40f, 0x9b59b6, 0x1abc9c, 0xffffff];

class HumanGenerator {
    static generate(config) {
        if (typeof config === 'number') {
            const rnd = R(config);
            for(let i=0;i<5;i++) rnd();
            config = {
                skin: Math.floor(rnd()*skinTones.length),
                hair: Math.floor(rnd()*hairColors.length),
                shirt: Math.floor(rnd()*shirtColors.length),
                pants: Math.floor(rnd()*pantsColors.length),
                buildType: Math.floor(rnd()*3),
                heightType: Math.floor(rnd()*3),
                hairType: Math.floor(rnd()*12)
            };
        }
        
        const group = new THREE.Group();
        group.userData = { isHuman: true, config };

        const skinMat = getMat(skinTones[config.skin], 'standard', 0.4);
        const hairMat = getMat(hairColors[config.hair], 'physical', 0.8);
        const shirtMat = getMat(shirtColors[config.shirt], 'standard', 0.9);
        const pantsMat = getMat(pantsColors[config.pants], 'standard', 0.9);
        const shoeMat = getMat(0x111111, 'physical', 0.4);

        const root = createBone('root');
        group.add(root);
        const hips = createBone('hips');
        hips.position.y = 1.0;
        root.add(hips);

        const sX = config.buildType===0?0.8 : (config.buildType===2?1.2 : 1.0);
        const sY = config.heightType===0?0.8 : (config.heightType===2?1.2 : 1.0);

        const spine = createBone('spine');
        hips.add(spine);
        
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.35 * sX, 0.6 * sY, 4, 12), shirtMat);
        torso.position.y = 0.3 * sY + 0.35;
        torso.castShadow = true;
        spine.add(torso);

        const neck = createBone('neck');
        neck.position.y = 0.6 * sY + 0.7;
        spine.add(neck);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), skinMat);
        head.position.y = 0.4;
        head.castShadow = true;
        neck.add(head);

        const eyeMat = getMat(0x111111, 'physical');
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
        eyeL.position.set(-0.15, 0.45, 0.35);
        const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
        eyeR.position.set(0.15, 0.45, 0.35);
        neck.add(eyeL);
        neck.add(eyeR);

        let hg;
        if(config.hairType < 3) hg = new THREE.CapsuleGeometry(0.42, 0.1, 4, 16);
        else if(config.hairType < 6) hg = new THREE.SphereGeometry(0.45, 16, 16, 0, Math.PI*2, 0, Math.PI/2);
        else hg = new THREE.BoxGeometry(0.85, 0.3, 0.85);
        const hairMesh = new THREE.Mesh(hg, hairMat);
        hairMesh.position.y = 0.5;
        if(config.hairType < 3) hairMesh.rotation.z = Math.PI/2;
        neck.add(hairMesh);

        const addArm = (isLeft) => {
            const shoulder = createBone(isLeft ? 'LShoulder' : 'RShoulder');
            shoulder.position.set((isLeft?-1:1)*(0.45 * sX), 0.6 * sY + 0.5, 0);
            spine.add(shoulder);

            const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.4, 4, 8), shirtMat);
            upperArm.position.y = -0.2;
            shoulder.add(upperArm);

            const elbow = createBone(isLeft ? 'LElbow' : 'RElbow');
            elbow.position.y = -0.4;
            shoulder.add(elbow);

            const lowerArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.4, 4, 8), skinMat);
            lowerArm.position.y = -0.2;
            elbow.add(lowerArm);

            return { shoulder, elbow };
        };
        const lArm = addArm(true);
        const rArm = addArm(false);

        const addLeg = (isLeft) => {
            const hipJoint = createBone(isLeft ? 'LHip' : 'RHip');
            hipJoint.position.set((isLeft?-1:1)*(0.2 * sX), 0.2, 0);
            hips.add(hipJoint);

            const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.4 * sY, 4, 8), pantsMat);
            thigh.position.y = -0.2 * sY;
            hipJoint.add(thigh);

            const knee = createBone(isLeft ? 'LKnee' : 'RKnee');
            knee.position.y = -0.4 * sY;
            hipJoint.add(knee);

            const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.4 * sY, 4, 8), skinMat);
            calf.position.y = -0.2 * sY;
            knee.add(calf);

            const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.3), shoeMat);
            shoe.position.set(0, -0.4 * sY - 0.075, 0.05);
            knee.add(shoe);

            return { hipJoint, knee };
        };
        const lLeg = addLeg(true);
        const rLeg = addLeg(false);
        
        group.userData.rig = { root, hips, spine, neck, lArm, rArm, lLeg, rLeg };
        lArm.shoulder.rotation.z = 0.3;
        rArm.shoulder.rotation.z = -0.3;
        group.scale.set(0.6, 0.6, 0.6);
        group.position.y = 0.1;
        return group;
    }
}

class AnimalGenerator {
    static generate(config) {
        if (typeof config === 'number') {
            const rnd = R(config);
            config = {
                color: Math.floor(rnd()*animalColors.length)
            };
        }
        const group = new THREE.Group();
        group.userData = { isAnimal: true, config };
        
        const furMat = getMat(animalColors[config.color], 'standard', 0.9);
        const secMat = getMat(0xffffff, 'standard', 0.9);
        const eyeMat = getMat(0x111111, 'physical');
        
        const root = createBone('root');
        group.add(root);
        const bodyBone = createBone('body');
        bodyBone.position.y = 0.7;
        root.add(bodyBone);
        
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.4, 8, 16), furMat);
        body.castShadow = true;
        bodyBone.add(body);
        
        const headBone = createBone('head');
        headBone.position.y = 0.5;
        bodyBone.add(headBone);
        
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), furMat);
        head.position.y = 0.1;
        head.castShadow = true;
        headBone.add(head);
        
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
        eyeL.position.set(-0.12, 0.15, 0.3);
        const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
        eyeR.position.set(0.12, 0.15, 0.3);
        headBone.add(eyeL);
        headBone.add(eyeR);
        
        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), secMat);
        snout.position.set(0, 0.05, 0.35);
        headBone.add(snout);
        
        const earL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 8), furMat);
        earL.position.set(-0.2, 0.4, 0);
        earL.rotation.z = 0.2;
        const earR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 8), furMat);
        earR.position.set(0.2, 0.4, 0);
        earR.rotation.z = -0.2;
        headBone.add(earL);
        headBone.add(earR);
        
        const tailBone = createBone('tail');
        tailBone.position.set(0, -0.2, -0.25);
        bodyBone.add(tailBone);
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.4, 4, 8), furMat);
        tail.position.set(0, 0, -0.2);
        tail.rotation.x = Math.PI / 2;
        tailBone.add(tail);
        
        const addLimb = (x, y, z) => {
            const l = createBone('limb');
            l.position.set(x, y, z);
            bodyBone.add(l);
            const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.25, 4, 8), furMat);
            mesh.position.y = -0.125;
            l.add(mesh);
            return l;
        };
        const fl = addLimb(-0.2, -0.1, 0.2);
        const fr = addLimb(0.2, -0.1, 0.2);
        const bl = addLimb(-0.2, -0.3, -0.1);
        const br = addLimb(0.2, -0.3, -0.1);
        
        group.userData.rig = { root, body: bodyBone, head: headBone, tail: tailBone, limbs: [fl, fr, bl, br] };
        group.scale.set(0.7, 0.7, 0.7);
        return group;
    }
}

class VehicleGenerator {
    static generate(config) {
        if (typeof config === 'number') {
            const rnd = R(config);
            config = {
                color: Math.floor(rnd()*vehicleColors.length),
                type: Math.floor(rnd()*3)
            };
        }
        const group = new THREE.Group();
        group.userData = { isVehicle: true, config };
        
        const bodyMat = getMat(vehicleColors[config.color], 'physical', 0.2);
        const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x88ccff, transmission: 0.9, opacity: 1, transparent: true, roughness: 0.1 });
        const detailMat = getMat(0x222222, 'standard', 0.5);
        
        const root = createBone('root');
        group.add(root);
        const bodyBone = createBone('body');
        bodyBone.position.y = 1.0;
        root.add(bodyBone);
        
        const rotors = [];
        const wheels = [];
        
        if (config.type === 0) { // Car
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 1.4), bodyMat);
            const top = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.8), glassMat);
            top.position.set(0, 0.35, -0.1);
            bodyBone.add(body);
            bodyBone.add(top);
            
            const addWheel = (x, z) => {
                const w = new THREE.Group();
                w.position.set(x, -0.2, z);
                const wm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), detailMat);
                wm.rotation.z = Math.PI/2;
                w.add(wm);
                bodyBone.add(w);
                wheels.push(w);
            };
            addWheel(-0.45, 0.4);
            addWheel(0.45, 0.4);
            addWheel(-0.45, -0.4);
            addWheel(0.45, -0.4);
        } else if (config.type === 1) { // Aeroplane
            const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.5, 8, 16), bodyMat);
            body.rotation.x = Math.PI/2;
            const wings = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.4), bodyMat);
            const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.2), bodyMat);
            tail.position.set(0, 0, -0.7);
            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.3), bodyMat);
            fin.position.set(0, 0.2, -0.7);
            
            bodyBone.add(body);
            bodyBone.add(wings);
            bodyBone.add(tail);
            bodyBone.add(fin);
            
            const prop = new THREE.Group();
            prop.position.set(0, 0, 0.9);
            const propM = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.05), detailMat);
            prop.add(propM);
            bodyBone.add(prop);
            rotors.push({ mesh: prop, axis: 'z' });
        } else { // Helicopter
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), bodyMat);
            const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.0), bodyMat);
            tail.position.set(0, 0, -0.5);
            const glass = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI*2, 0, Math.PI/2), glassMat);
            glass.rotation.x = Math.PI/2;
            
            const mainRotor = new THREE.Group();
            mainRotor.position.set(0, 0.45, 0);
            mainRotor.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 0.1), detailMat));
            mainRotor.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 1.6), detailMat));
            
            const tailRotor = new THREE.Group();
            tailRotor.position.set(0.1, 0, -0.9);
            const trm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.05), detailMat);
            tailRotor.add(trm);
            
            bodyBone.add(body);
            bodyBone.add(tail);
            bodyBone.add(glass);
            bodyBone.add(mainRotor);
            bodyBone.add(tailRotor);
            rotors.push({ mesh: mainRotor, axis: 'y' });
            rotors.push({ mesh: tailRotor, axis: 'x' });
        }
        
        group.userData.rig = { root, body: bodyBone, rotors, wheels };
        group.scale.set(0.6, 0.6, 0.6);
        return group;
    }
}

class BuddyViewer {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({ alpha: true, premultipliedAlpha: true, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.scene = new THREE.Scene();
        
        const hemiLight = new THREE.HemisphereLight(0x00ffaa, 0x0044ff, 0.4);
        this.scene.add(hemiLight);
        
        const keyLight = new THREE.DirectionalLight(0x00ffaa, 1.5);
        keyLight.position.set(5, 8, 5);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        this.scene.add(keyLight);
        
        const fillLight = new THREE.DirectionalLight(0x00a2ff, 1.2);
        fillLight.position.set(-5, 3, 5);
        this.scene.add(fillLight);
        
        const rimLight = new THREE.DirectionalLight(0xff00aa, 1.8);
        rimLight.position.set(0, 5, -8);
        this.scene.add(rimLight);
        
        const floorLight = new THREE.PointLight(0x00ffaa, 2, 10);
        floorLight.position.set(0, 0.1, 0);
        this.scene.add(floorLight);
        
        const planeGeo = new THREE.PlaneGeometry(10, 10);
        const shadowMat = new THREE.ShadowMaterial({ opacity: 0.3 });
        const plane = new THREE.Mesh(planeGeo, shadowMat);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        this.scene.add(plane);
        
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.set(0, 1.5, 4.5);
        this.camera.lookAt(0, 1.2, 0);

        this.instances = [];
        this.renderLoop();
    }
    
    addInstance(container, id, state='idle') {
        let model;
        if (typeof id === 'object') {
            if (id.species === 'human') model = HumanGenerator.generate(id);
            else if (id.species === 'animal') model = AnimalGenerator.generate(id);
            else model = VehicleGenerator.generate(id);
        } else {
            if (id < 24) model = HumanGenerator.generate(id);
            else if (id < 40) model = AnimalGenerator.generate(id);
            else model = VehicleGenerator.generate(id);
        }
        
        this.scene.add(model);
        const inst = { container, model, state, time: Math.random()*10 };
        
        if (state === 'studio') {
            inst.controls = new OrbitControls(this.camera, this.renderer.domElement);
            inst.controls.enableDamping = true;
            inst.controls.target.set(0, 1.2, 0);
        }
        
        this.instances.push(inst);
        return inst;
    }
    
    disposeModel(model) {
        if (!model) return;
        model.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        this.scene.remove(model);
    }
    
    setInstanceState(inst, state) {
        inst.state = state;
    }
    
    updateModel(inst, config) {
        if (inst.model) this.disposeModel(inst.model);
        let model;
        if (config.species === 'human') model = HumanGenerator.generate(config);
        else if (config.species === 'animal') model = AnimalGenerator.generate(config);
        else model = VehicleGenerator.generate(config);
        this.scene.add(model);
        inst.model = model;
        inst.img = null; // force re-render
    }
    
    removeInstance(inst) {
        if (inst.model) this.disposeModel(inst.model);
        if(inst.controls) inst.controls.dispose();
        this.instances = this.instances.filter(i => i !== inst);
    }
    
    renderLoop() {
        requestAnimationFrame(() => this.renderLoop());
        const dt = 0.016; 
        
        for (const inst of this.instances) {
            inst.time += dt;
            if(inst.controls) inst.controls.update();
            const rig = inst.model.userData.rig;
            if(!rig) continue;
            const t = inst.time;
            
            if (inst.model.userData.isHuman) {
                rig.hips.position.y = 1.0;
                rig.spine.rotation.set(0,0,0);
                rig.neck.rotation.set(0,0,0);
                rig.lArm.shoulder.rotation.set(0,0,0.3);
                rig.rArm.shoulder.rotation.set(0,0,-0.3);
                rig.lLeg.hipJoint.rotation.set(0,0,0);
                rig.rLeg.hipJoint.rotation.set(0,0,0);
                rig.lLeg.knee.rotation.x = 0;
                rig.rLeg.knee.rotation.x = 0;
                rig.lArm.elbow.rotation.x = 0;
                rig.rArm.elbow.rotation.x = 0;
                
                if (inst.state === 'idle' || inst.state === 'studio') {
                    rig.spine.rotation.x = Math.sin(t*2)*0.02;
                    rig.neck.rotation.x = Math.sin(t*2+1)*0.02;
                    rig.lArm.shoulder.rotation.x = Math.sin(t*2)*0.05;
                    rig.rArm.shoulder.rotation.x = Math.sin(t*2+0.5)*0.05;
                } else if (inst.state === 'move') {
                    rig.hips.position.y = 1.0 + Math.abs(Math.sin(t*10))*0.1;
                    rig.spine.rotation.z = Math.sin(t*10)*0.05;
                    rig.lArm.shoulder.rotation.x = Math.sin(t*10)*0.5;
                    rig.rArm.shoulder.rotation.x = -Math.sin(t*10)*0.5;
                    rig.lLeg.hipJoint.rotation.x = -Math.sin(t*10)*0.5;
                    rig.rLeg.hipJoint.rotation.x = Math.sin(t*10)*0.5;
                    rig.lLeg.knee.rotation.x = Math.max(0, Math.sin(t*10)*0.5);
                    rig.rLeg.knee.rotation.x = Math.max(0, -Math.sin(t*10)*0.5);
                } else if (inst.state === 'talk') {
                    rig.spine.rotation.x = Math.sin(t*5)*0.05;
                    rig.lArm.shoulder.rotation.x = -0.5 + Math.sin(t*8)*0.2;
                    rig.lArm.elbow.rotation.x = -0.5;
                } else if (inst.state === 'celebrate') {
                    rig.hips.position.y = 1.0 + Math.abs(Math.sin(t*15))*0.3;
                    rig.lArm.shoulder.rotation.z = 2.5;
                    rig.rArm.shoulder.rotation.z = -2.5;
                }
            } else if (inst.model.userData.isAnimal) {
                rig.body.position.y = 0.7;
                rig.body.rotation.set(0,0,0);
                rig.head.rotation.set(0,0,0);
                rig.tail.rotation.set(0,0,0);
                rig.limbs.forEach(l => l.rotation.set(0,0,0));
                
                if (inst.state === 'idle' || inst.state === 'studio') {
                    rig.body.rotation.x = Math.sin(t*2)*0.02;
                    rig.head.rotation.x = Math.sin(t*2+1)*0.05;
                    rig.tail.rotation.z = Math.sin(t*3)*0.2;
                } else if (inst.state === 'move') {
                    rig.body.position.y = 0.7 + Math.abs(Math.sin(t*15))*0.2;
                    rig.body.rotation.z = Math.sin(t*10)*0.1;
                    rig.limbs[0].rotation.x = Math.sin(t*15)*0.5;
                    rig.limbs[1].rotation.x = -Math.sin(t*15)*0.5;
                    rig.limbs[2].rotation.x = -Math.sin(t*15)*0.5;
                    rig.limbs[3].rotation.x = Math.sin(t*15)*0.5;
                } else if (inst.state === 'celebrate') {
                    rig.body.position.y = 0.7 + Math.abs(Math.sin(t*20))*0.4;
                    rig.body.rotation.y = t * 5;
                } else if (inst.state === 'talk') {
                    rig.head.rotation.x = Math.sin(t*10)*0.2;
                }
            } else if (inst.model.userData.isVehicle) {
                rig.body.position.y = 1.0;
                rig.body.rotation.set(0,0,0);
                
                if (inst.state === 'idle' || inst.state === 'studio') {
                    rig.body.position.y = 1.0 + Math.sin(t*2)*0.05;
                    rig.body.rotation.z = Math.sin(t*1.5)*0.02;
                } else if (inst.state === 'move') {
                    rig.body.position.y = 1.0 + Math.sin(t*5)*0.1;
                    rig.body.rotation.z = Math.sin(t*3)*0.1;
                    rig.body.rotation.x = 0.1;
                } else if (inst.state === 'celebrate') {
                    rig.body.position.y = 1.5 + Math.sin(t*8)*0.2;
                    rig.body.rotation.y = t * 3;
                }
                
                if (inst.state === 'move' || inst.state === 'celebrate') {
                    rig.rotors.forEach(r => {
                        if(r.axis === 'x') r.mesh.rotation.x += 0.5;
                        if(r.axis === 'y') r.mesh.rotation.y += 0.5;
                        if(r.axis === 'z') r.mesh.rotation.z += 0.5;
                    });
                    rig.wheels.forEach(w => w.rotation.x += 0.5);
                }
            }
        }
        
        for (const inst of this.instances) {
            if (inst.state === 'studio') {
                this.scene.children.forEach(c => { if(c.userData.isHuman || c.userData.isAnimal || c.userData.isVehicle) c.visible = false; });
                inst.model.visible = true;
                
                const w = inst.container.clientWidth || 300;
                const h = inst.container.clientHeight || 300;
                if (this.renderer.domElement.width !== w || this.renderer.domElement.height !== h) {
                    this.renderer.setSize(w, h, false);
                    this.camera.aspect = w / h;
                    this.camera.updateProjectionMatrix();
                }
                if (this.renderer.domElement.parentNode !== inst.container) {
                    inst.container.innerHTML = '';
                    inst.container.appendChild(this.renderer.domElement);
                }
                this.renderer.render(this.scene, this.camera);
                break;
            } else {
                if (!inst.img) {
                    this.scene.children.forEach(c => { if(c.userData.isHuman || c.userData.isAnimal || c.userData.isVehicle) c.visible = false; });
                    inst.model.visible = true;
                    
                    const w = inst.container.clientWidth || 100;
                    const h = inst.container.clientHeight || 100;
                    this.renderer.setSize(w, h, false);
                    this.camera.aspect = w / h;
                    this.camera.updateProjectionMatrix();
                    
                    this.renderer.render(this.scene, this.camera);
                    
                    inst.img = new Image();
                    inst.img.src = this.renderer.domElement.toDataURL('image/png');
                    inst.img.style.width = '100%';
                    inst.img.style.height = '100%';
                    inst.img.style.objectFit = 'contain';
                    inst.container.innerHTML = '';
                    inst.container.appendChild(inst.img);
                    
                    inst.container.onmouseenter = () => { inst.hover = true; inst.container.innerHTML = ''; inst.container.appendChild(this.renderer.domElement); };
                    inst.container.onmouseleave = () => { inst.hover = false; inst.container.innerHTML = ''; inst.container.appendChild(inst.img); };
                }
                
                if (inst.hover || inst.state !== 'idle') {
                    this.scene.children.forEach(c => { if(c.userData.isHuman || c.userData.isAnimal || c.userData.isVehicle) c.visible = false; });
                    inst.model.visible = true;
                    
                    const w = inst.container.clientWidth || 100;
                    const h = inst.container.clientHeight || 100;
                    if (this.renderer.domElement.width !== w || this.renderer.domElement.height !== h) {
                        this.renderer.setSize(w, h, false);
                        this.camera.aspect = w / h;
                        this.camera.updateProjectionMatrix();
                    }
                    if (this.renderer.domElement.parentNode !== inst.container) {
                        inst.container.innerHTML = '';
                        inst.container.appendChild(this.renderer.domElement);
                    }
                    this.renderer.render(this.scene, this.camera);
                    break;
                }
            }
        }
    }
}

export const Configs = { skinTones, hairColors, shirtColors, pantsColors, animalColors, vehicleColors };
const viewer = new BuddyViewer();
export default viewer;

export * as THREE from 'three';
