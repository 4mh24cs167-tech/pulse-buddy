import * as THREE from 'three';

export class AnimationController {
    constructor(mesh) {
        this.mesh = mesh;
        this.currentState = 'IDLE';
        this.targetState = 'IDLE';
        this.mixWeight = 1.0;
        this.speed = 1.0;
        this.paused = false;
        this.time = 0;
        
        // Setup default pose mapping for interpolation
        this.poseA = this.createPoseMap();
        this.poseB = this.createPoseMap();
    }
    
    play(state) {
        this.currentState = state;
        this.targetState = state;
        this.mixWeight = 1.0;
        this.time = 0;
    }
    
    pause() { this.paused = true; }
    resume() { this.paused = false; }
    stop() { this.play('IDLE'); this.time = 0; }
    setSpeed(speed) { this.speed = speed; }
    reset() { this.time = 0; this.mixWeight = 1.0; this.currentState = 'IDLE'; this.targetState = 'IDLE'; }

    crossFadeTo(state, duration) {
        if (this.targetState === state) return;
        this.currentState = this.targetState; // Snap current to where we were heading
        this.targetState = state;
        this.mixWeight = 0.0;
        this.fadeSpeed = 1.0 / duration;
    }

    createPoseMap() {
        return {
            root: { pos: new THREE.Vector3(), rot: new THREE.Vector3() },
            hips: { pos: new THREE.Vector3(), rot: new THREE.Vector3() },
            spine: { pos: new THREE.Vector3(), rot: new THREE.Vector3() },
            neck: { pos: new THREE.Vector3(), rot: new THREE.Vector3() },
            lArm: { pos: new THREE.Vector3(), rot: new THREE.Vector3() },
            rArm: { pos: new THREE.Vector3(), rot: new THREE.Vector3() },
            lLeg: { pos: new THREE.Vector3(), rot: new THREE.Vector3() },
            rLeg: { pos: new THREE.Vector3(), rot: new THREE.Vector3() },
            flLeg: { pos: new THREE.Vector3(), rot: new THREE.Vector3() },
            frLeg: { pos: new THREE.Vector3(), rot: new THREE.Vector3() },
            blLeg: { pos: new THREE.Vector3(), rot: new THREE.Vector3() },
            brLeg: { pos: new THREE.Vector3(), rot: new THREE.Vector3() },
            tail: { pos: new THREE.Vector3(), rot: new THREE.Vector3() }
        };
    }

    evaluatePose(state, pose, t) {
        const isHuman = this.mesh.userData.isHuman;
        const isAnimal = this.mesh.userData.isAnimal;
        const isPhoto = this.mesh.userData.isPhoto;
        const isFantasy = this.mesh.userData.isFantasy;
        const isRobot = this.mesh.userData.isRobot;

        // Reset all
        for (const k in pose) {
            pose[k].pos.set(0,0,0);
            pose[k].rot.set(0,0,0);
        }

        if (isHuman || isFantasy) {
            pose.hips.pos.y = 1.0;
            if (state === 'WALK' || state === 'RUN') {
                const spd = state === 'RUN' ? 10.0 : 6.0;
                const cycle = t * spd;
                // Proper gait cycle
                pose.lLeg.rot.x = Math.sin(cycle) * 0.6;
                pose.rLeg.rot.x = Math.sin(cycle + Math.PI) * 0.6;
                pose.lArm.rot.x = Math.sin(cycle + Math.PI) * 0.5; // Opposing arm swing
                pose.rArm.rot.x = Math.sin(cycle) * 0.5;
                pose.hips.pos.y = 1.0 + Math.abs(Math.sin(cycle * 2)) * 0.05; // Hip bounce
                pose.spine.rot.y = Math.sin(cycle) * 0.1; // Torso twist
            } else if (state === 'WAVE') {
                pose.rArm.rot.z = -2.0;
                pose.rArm.rot.x = Math.sin(t * 10) * 0.5;
            } else if (state === 'HAPPY' || state === 'CELEBRATE') {
                pose.hips.pos.y = 1.0 + Math.abs(Math.sin(t * 8)) * 0.2;
                pose.lArm.rot.z = 2.5; pose.rArm.rot.z = -2.5;
                if (state === 'CELEBRATE') pose.root.rot.y = t * 4;
            } else if (state === 'SAD') {
                pose.spine.rot.x = 0.3;
                pose.neck.rot.x = 0.5;
                pose.lArm.rot.z = 0.2; pose.rArm.rot.z = -0.2;
            } else if (state === 'FOCUSED') {
                pose.rArm.rot.z = -1.0; pose.rArm.rot.x = -1.0; // Hand to chin
                pose.neck.rot.y = -0.2;
            } else {
                // IDLE
                pose.spine.rot.x = Math.sin(t * 2) * 0.02;
                pose.lArm.rot.z = 0.1; pose.rArm.rot.z = -0.1;
            }
            
            if (isFantasy) {
                // Wings flap
                if (pose.lArm) pose.lArm.rot.z += Math.sin(t * 5) * 0.3;
                if (pose.rArm) pose.rArm.rot.z -= Math.sin(t * 5) * 0.3;
                if (pose.tail) pose.tail.rot.x = Math.sin(t * 3) * 0.3;
            }
        }
        else if (isAnimal) {
            pose.hips.pos.y = 0.5;
            if (state === 'WALK' || state === 'RUN') {
                const spd = state === 'RUN' ? 10.0 : 6.0;
                const cycle = t * spd;
                pose.flLeg.rot.x = Math.sin(cycle) * 0.5;
                pose.brLeg.rot.x = Math.sin(cycle) * 0.5;
                pose.frLeg.rot.x = Math.sin(cycle + Math.PI) * 0.5;
                pose.blLeg.rot.x = Math.sin(cycle + Math.PI) * 0.5;
                if(pose.tail) pose.tail.rot.z = Math.sin(cycle * 2) * 0.3;
                pose.hips.pos.y = 0.5 + Math.abs(Math.sin(cycle * 2)) * 0.1;
            } else if (state === 'IDLE') {
                if(pose.tail) pose.tail.rot.z = Math.sin(t * 5) * 0.2;
                pose.neck.rot.x = Math.sin(t) * 0.05;
            } else if (state === 'SAD') {
                pose.neck.rot.x = -0.5;
                if(pose.tail) pose.tail.rot.x = -0.4;
            } else if (state === 'CELEBRATE') {
                pose.hips.pos.y = 0.5 + Math.abs(Math.sin(t * 10)) * 0.3;
            }
        }
        else if (isRobot) {
            pose.hips.pos.y = 1.0;
            if (state === 'WALK') {
                const cycle = t * 4.0; // Stiff walk
                pose.lLeg.rot.x = Math.sign(Math.sin(cycle)) * 0.4;
                pose.rLeg.rot.x = Math.sign(Math.sin(cycle + Math.PI)) * 0.4;
            } else if (state === 'CELEBRATE') {
                pose.root.rot.y = t * 5;
            }
        }
        else if (isPhoto) {
            pose.hips.pos.y = 0.5;
            if (state === 'WALK' || state === 'RUN') {
                pose.hips.pos.y = 0.5 + Math.abs(Math.sin(t * 8)) * 0.1;
                pose.spine.rot.z = Math.sin(t * 8) * 0.1; // Bob and weave
            } else if (state === 'IDLE') {
                pose.spine.rot.x = Math.sin(t * 2) * 0.02; // Breathing parallax
            } else if (state === 'SAD') {
                pose.spine.rot.x = -0.2;
                pose.hips.pos.y = 0.4;
            }
        }
    }

    applyPoseToRig(poseMap, weight) {
        const rig = this.mesh.userData.rig;
        if (!rig) return;
        const euler = new THREE.Euler();
        
        for (const k in poseMap) {
            if (rig[k]) {
                const bone = rig[k];
                const p = poseMap[k];
                // Positional mix
                if (k === 'hips' || k === 'root') {
                    bone.position.lerp(p.pos, weight);
                }
                
                // Rotational mix
                euler.set(p.rot.x, p.rot.y, p.rot.z);
                const q = new THREE.Quaternion().setFromEuler(euler);
                if (weight === 1.0) {
                    bone.quaternion.copy(q);
                } else {
                    bone.quaternion.slerp(q, weight);
                }
            }
        }
    }

    update(dt) {
        if (this.paused) return;
        this.time += dt * this.speed;
        
        if (this.mixWeight < 1.0) {
            this.mixWeight += this.fadeSpeed * dt;
            if (this.mixWeight > 1.0) this.mixWeight = 1.0;
        }

        if (this.mixWeight >= 1.0) {
            this.evaluatePose(this.targetState, this.poseA, this.time);
            this.applyPoseToRig(this.poseA, 1.0);
        } else {
            this.evaluatePose(this.currentState, this.poseA, this.time);
            this.evaluatePose(this.targetState, this.poseB, this.time);
            
            // Apply current fully, then slerp target over it
            this.applyPoseToRig(this.poseA, 1.0);
            this.applyPoseToRig(this.poseB, this.mixWeight);
        }
    }
}