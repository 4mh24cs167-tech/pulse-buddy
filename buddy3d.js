import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AnimationController, BuddyMovementController, EmotionController, BuddyBehaviorController } from './src/buddy/BuddyEngine.js';

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

const createJoint = (name) => {
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

        const root = createJoint('root');
        group.add(root);
        const hips = createJoint('hips');
        hips.position.y = 1.0;
        root.add(hips);

        const sX = config.buildType===0?0.8 : (config.buildType===2?1.2 : 1.0);
        const sY = config.heightType===0?0.8 : (config.heightType===2?1.2 : 1.0);

        const spine = createJoint('spine');
        hips.add(spine);
        
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.35 * sX, 0.6 * sY, 4, 12), shirtMat);
        torso.position.y = 0.3 * sY + 0.35;
        torso.castShadow = true;
        spine.add(torso);

        const neck = createJoint('neck');
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
            const shoulder = createJoint(isLeft ? 'LShoulder' : 'RShoulder');
            shoulder.position.set((isLeft?-1:1)*(0.45 * sX), 0.6 * sY + 0.5, 0);
            spine.add(shoulder);

            const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.4, 4, 8), shirtMat);
            upperArm.position.y = -0.2;
            shoulder.add(upperArm);

            const elbow = createJoint(isLeft ? 'LElbow' : 'RElbow');
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
            const hipJoint = createJoint(isLeft ? 'LHip' : 'RHip');
            hipJoint.position.set((isLeft?-1:1)*(0.2 * sX), 0.2, 0);
            hips.add(hipJoint);

            const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.4 * sY, 4, 8), pantsMat);
            thigh.position.y = -0.2 * sY;
            hipJoint.add(thigh);

            const knee = createJoint(isLeft ? 'LKnee' : 'RKnee');
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
        
        const root = createJoint('root');
        group.add(root);
        const bodyBone = createJoint('body');
        bodyBone.position.y = 0.7;
        root.add(bodyBone);
        
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.4, 8, 16), furMat);
        body.castShadow = true;
        bodyBone.add(body);
        
        const headBone = createJoint('head');
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
        
        const tailBone = createJoint('tail');
        tailBone.position.set(0, -0.2, -0.25);
        bodyBone.add(tailBone);
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.4, 4, 8), furMat);
        tail.position.set(0, 0, -0.2);
        tail.rotation.x = Math.PI / 2;
        tailBone.add(tail);
        
        const addLimb = (x, y, z) => {
            const l = createJoint('limb');
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
        
        const root = createJoint('root');
        group.add(root);
        const bodyBone = createJoint('body');
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


class RobotGenerator {
    static generate(config) {
        const group = new THREE.Group();
        group.userData = { isRobot: true, config };
        const mat = getMat(0x666666, 'standard', 0.8, 1.0);
        const glow = getMat(0x00ffcc, 'basic');
        const root = createJoint('root'); group.add(root);
        const hips = createJoint('hips'); root.add(hips); hips.position.y = 1.0;
        const spine = createJoint('spine'); hips.add(spine);
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), mat);
        torso.position.y = 0.4; spine.add(torso);
        const head = createJoint('neck'); spine.add(head); head.position.y = 0.8;
        const skull = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat);
        skull.position.y = 0.2; head.add(skull);
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), glow);
        eye.position.set(0, 0.2, 0.21); head.add(eye);
        const lLeg = createJoint('lLeg'); hips.add(lLeg); lLeg.position.set(0.2, 0, 0);
        const rLeg = createJoint('rLeg'); hips.add(rLeg); rLeg.position.set(-0.2, 0, 0);
        lLeg.add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.0, 0.15), mat).translateY(-0.5));
        rLeg.add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.0, 0.15), mat).translateY(-0.5));
        group.userData.rig = { root, hips, spine, neck: head, lLeg, rLeg };
        return group;
    }
}
class FantasyGenerator {
    static generate(config) {
        const group = new THREE.Group();
        group.userData = { isFantasy: true, config };
        const mat = getMat(0xaa33ff, 'standard', 0.2, 0.1);
        const root = createJoint('root'); group.add(root);
        const hips = createJoint('hips'); root.add(hips); hips.position.y = 1.0;
        const spine = createJoint('spine'); hips.add(spine);
        const torso = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), mat);
        torso.position.y = 0.4; torso.scale.y = 1.5; spine.add(torso);
        const lArm = createJoint('lArm'); spine.add(lArm); lArm.position.set(0.4, 0.8, 0);
        const rArm = createJoint('rArm'); spine.add(rArm); rArm.position.set(-0.4, 0.8, 0);
        const wingGeo = new THREE.ConeGeometry(0.8, 1.5, 3);
        const lWing = new THREE.Mesh(wingGeo, mat); lWing.rotation.z = -Math.PI/2; lWing.position.x = 0.75;
        const rWing = new THREE.Mesh(wingGeo, mat); rWing.rotation.z = Math.PI/2; rWing.position.x = -0.75;
        lArm.add(lWing); rArm.add(rWing);
        const head = createJoint('neck'); spine.add(head); head.position.y = 1.0;
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), mat);
        skull.position.y = 0.15; head.add(skull);
        const tail = createJoint('tail'); hips.add(tail); tail.position.set(0, 0, -0.4);
        const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.1, 1.0, 8), mat);
        tailMesh.rotation.x = Math.PI/2; tailMesh.position.z = -0.5; tail.add(tailMesh);
        group.userData.rig = { root, hips, spine, neck: head, lArm, rArm, tail };
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
        
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.set(0, 1.5, 4.5);
        this.camera.lookAt(0, 1.2, 0);

        this.instances = [];
        this.renderLoop();
    }
    
    addInstance(container, id, state='IDLE') {
        let model;
        if (typeof id === 'string') {
            // PHOTO BUDDY (2.5D Custom Asset)
            model = new THREE.Group();
            model.userData = { isPhoto: true };
            const tex = new THREE.TextureLoader().load(id);
            const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
            const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
            plane.position.y = 0.5;
            
            // simple rig
            const root = new THREE.Group();
            root.name = 'root';
            const hips = new THREE.Group();
            hips.name = 'hips';
            hips.position.y = 0.5;
            root.add(hips);
            const spine = new THREE.Group();
            spine.name = 'spine';
            hips.add(spine);
            spine.add(plane);
            
            model.add(root);
            model.userData.rig = { root, hips, spine };
        } else {
            let isObj = typeof id === 'object';
            let cat = isObj ? id.species : null;
            let idNum = isObj ? null : id;
            if (cat === 'human' || (idNum !== null && idNum < 18)) model = HumanGenerator.generate(id);
            else if (cat === 'animal' || (idNum !== null && idNum < 42)) model = AnimalGenerator.generate(id);
            else if (cat === 'vehicle' || (idNum !== null && idNum < 54)) model = VehicleGenerator.generate(id);
            else if (cat === 'robot' || (idNum !== null && idNum < 64)) model = RobotGenerator.generate(id);
            else model = FantasyGenerator.generate(id);
}
/*
            if (id < 24) model = HumanGenerator.generate(id);
            else if (id < 40) model = AnimalGenerator.generate(id);
            else model = VehicleGenerator.generate(id);
        }
        
        */
        this.scene.add(model);
        
        const anim = new AnimationController(model);
        const movement = new BuddyMovementController(model, container);
        const emotion = new EmotionController(anim);
        const behavior = new BuddyBehaviorController(model, anim, movement, emotion);
        
        const inst = { container, model, anim, movement, emotion, behavior, state, time: Math.random()*10 };
        
        if (state === 'studio') {
            inst.controls = new OrbitControls(this.camera, this.renderer.domElement);
            inst.controls.enableDamping = true;
            inst.controls.target.set(0, 1.2, 0);
            behavior.idle();
        } else {
            // Just idle initially, overlay will call enterScreen
            behavior.idle();
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
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            }
        });
        this.scene.remove(model);
    }
    
    removeInstance(inst) {
        this.disposeModel(inst.model);
        this.instances = this.instances.filter(i => i !== inst);
        if (inst.container && inst.container.contains(this.renderer.domElement)) {
            inst.container.removeChild(this.renderer.domElement);
        }
    }

    setInstanceState(inst, state) {
        inst.state = state;
        if (inst.behavior) {
            inst.behavior.triggerEvent(state);
        }
    }
    
    updateModel(inst, config) {
        if (inst.model) this.disposeModel(inst.model);
        let model;
        
          let isObj2 = typeof config === 'object';
          let cat2 = isObj2 ? config.species : null;
          let idNum2 = isObj2 ? null : config;
          if (cat2 === 'human' || (idNum2 !== null && idNum2 < 18)) model = HumanGenerator.generate(config);
          else if (cat2 === 'animal' || (idNum2 !== null && idNum2 < 42)) model = AnimalGenerator.generate(config);
          else if (cat2 === 'vehicle' || (idNum2 !== null && idNum2 < 54)) model = VehicleGenerator.generate(config);
          else if (cat2 === 'robot' || (idNum2 !== null && idNum2 < 64)) model = RobotGenerator.generate(config);
          else model = FantasyGenerator.generate(config);

        this.scene.add(model);
        inst.model = model;
        
        // Re-attach controllers to new model
        inst.anim = new AnimationController(model);
        inst.movement = new BuddyMovementController(model, inst.container);
        inst.emotion = new EmotionController(inst.anim);
        inst.behavior = new BuddyBehaviorController(model, inst.anim, inst.movement, inst.emotion);
        inst.behavior.idle();
    }
    
    draw(container, id, state='IDLE') {
        const inst = this.addInstance(container, id, state);
        return inst;
    }
    
    update(inst, state) {
        this.setInstanceState(inst, state);
    }
    
    renderLoop() {
        requestAnimationFrame(() => this.renderLoop());
        const dt = 0.016; 
        
        // Find active instance (for now, we'll just render all instances in their respective containers or shared)
        // Since we are appending the renderer to the container dynamically, we need to handle viewport/scissor if multiple exist.
        // For our overlay, there's only 1 live buddy. For the Studio, there's 1 live buddy.
        // Let's assume the last instance is the active one.
        const inst = this.instances[this.instances.length - 1];
        
        if (inst) {
            inst.time += dt;
            if (inst.controls) inst.controls.update();
            if (inst.anim) inst.anim.update(dt);
            if (inst.movement) inst.movement.update(dt);
            
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
            
            // Hide other models
            this.scene.children.forEach(c => {
                if(c.userData.isHuman || c.userData.isAnimal || c.userData.isVehicle) c.visible = false;
            });
            inst.model.visible = true;
            
            this.renderer.render(this.scene, this.camera);
        }
    }
}

const viewer = new BuddyViewer();
if (typeof window !== 'undefined') window.Sprites = viewer;
export default viewer;
