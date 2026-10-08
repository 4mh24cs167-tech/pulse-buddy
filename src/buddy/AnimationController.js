import * as THREE from 'three';

export class AnimationController {
    constructor(mesh) {
        this.mesh = mesh;
        this.rig = mesh.userData.rig; // Ensure generators set this
        this.state = 'IDLE';
        this.time = 0;
        this.speed = 1.0;
        this.paused = false;
        this.blendTime = 0;
        this.blendDuration = 0;
        this.prevState = 'IDLE';
        
        // Save initial pose
        this.basePose = this.capturePose();
    }

    capturePose() {
        if (!this.rig) return {};
        const pose = {};
        for (const [key, bone] of Object.entries(this.rig)) {
            if (bone && bone.rotation) {
                pose[key] = {
                    rot: bone.rotation.clone(),
                    pos: bone.position.clone()
                };
            }
        }
        return pose;
    }

    play(name) {
        this.prevState = this.state;
        this.state = name;
        this.blendTime = 1.0; 
        this.blendDuration = 0; // Instant
    }

    crossFadeTo(name, duration) {
        this.prevState = this.state;
        this.state = name;
        this.blendTime = 0;
        this.blendDuration = duration;
    }

    stop() { this.play('IDLE'); }
    pause() { this.paused = true; }
    resume() { this.paused = false; }
    setSpeed(speed) { this.speed = speed; }
    queue(name) { /* To implement later if needed */ }
    reset() { this.time = 0; this.play('IDLE'); }

    lerpPose(dt) {
        if (!this.rig) return;
        
        // Calculate target pose
        const currentTarget = this.evaluatePose(this.state, this.time);
        
        let blendWeight = 1.0;
        if (this.blendDuration > 0 && this.blendTime < this.blendDuration) {
            this.blendTime += dt;
            blendWeight = Math.min(this.blendTime / this.blendDuration, 1.0);
        }

        const prevTarget = blendWeight < 1.0 ? this.evaluatePose(this.prevState, this.time) : null;

        for (const [key, bone] of Object.entries(this.rig)) {
            if (!bone || !bone.rotation) continue;
            
            const targetRot = new THREE.Euler().copy(currentTarget[key]?.rot || this.basePose[key].rot);
            const targetPos = new THREE.Vector3().copy(currentTarget[key]?.pos || this.basePose[key].pos);

            if (prevTarget && blendWeight < 1.0) {
                const pRot = prevTarget[key]?.rot || this.basePose[key].rot;
                const pPos = prevTarget[key]?.pos || this.basePose[key].pos;
                
                // Q Lerp for rotation
                const q1 = new THREE.Quaternion().setFromEuler(pRot);
                const q2 = new THREE.Quaternion().setFromEuler(targetRot);
                q1.slerp(q2, blendWeight);
                bone.quaternion.copy(q1);

                // Lerp pos
                bone.position.lerpVectors(pPos, targetPos, blendWeight);
            } else {
                bone.rotation.copy(targetRot);
                bone.position.copy(targetPos);
            }
        }
    }

    evaluatePose(state, t) {
        const pose = this.capturePose(); // Use current as template
        const isHuman = this.mesh.userData.isHuman;
        const isAnimal = this.mesh.userData.isAnimal;
        
        // Reset to base
        for (const key in pose) {
            pose[key].rot.set(0,0,0);
        }

        if (isHuman) {
            pose.hips.pos.y = 1.0;
            pose.lArm.shoulder.rot.z = 0.3;
            pose.rArm.shoulder.rot.z = -0.3;
            
            if (state === 'WALK' || state === 'RUN') {
                const speedMult = state === 'RUN' ? 2.0 : 1.0;
                const amp = state === 'RUN' ? 1.0 : 0.6;
                const cycle = t * speedMult * 5.0;
                
                pose.lLeg.hipJoint.rot.x = Math.sin(cycle) * amp;
                pose.rLeg.hipJoint.rot.x = Math.sin(cycle + Math.PI) * amp;
                pose.lLeg.knee.rot.x = Math.max(0, Math.sin(cycle + Math.PI/2) * amp);
                pose.rLeg.knee.rot.x = Math.max(0, Math.sin(cycle - Math.PI/2) * amp);
                
                pose.lArm.shoulder.rot.x = Math.sin(cycle + Math.PI) * amp;
                pose.rArm.shoulder.rot.x = Math.sin(cycle) * amp;
                pose.hips.pos.y = 1.0 + Math.abs(Math.sin(cycle * 2)) * 0.1 * amp;
            } 
            else if (state === 'IDLE') {
                pose.spine.rot.y = Math.sin(t) * 0.05;
                pose.hips.pos.y = 1.0 + Math.sin(t*2) * 0.02;
            }
            else if (state === 'WAVE') {
                pose.rArm.shoulder.rot.z = -2.0;
                pose.rArm.shoulder.rot.x = 0;
                pose.rArm.elbow.rot.z = Math.sin(t*10) * 0.5 - 0.5;
            }
            else if (state === 'HAPPY') {
                pose.hips.pos.y = 1.0 + Math.abs(Math.sin(t*8)) * 0.2;
                pose.lArm.shoulder.rot.z = 2.0;
                pose.rArm.shoulder.rot.z = -2.0;
                pose.spine.rot.x = 0.2;
            }
            else if (state === 'SAD') {
                pose.spine.rot.x = -0.3;
                pose.neck.rot.x = -0.4;
                pose.lArm.shoulder.rot.z = 0.1;
                pose.rArm.shoulder.rot.z = -0.1;
            }
            else if (state === 'FOCUSED') {
                pose.rArm.shoulder.rot.x = -1.0;
                pose.rArm.elbow.rot.x = -1.5;
                pose.neck.rot.y = Math.sin(t*2) * 0.2;
            }
            else if (state === 'CELEBRATE') {
                pose.hips.pos.y = 1.0 + Math.abs(Math.sin(t*10)) * 0.5;
                pose.lArm.shoulder.rot.z = 2.5;
                pose.rArm.shoulder.rot.z = -2.5;
                pose.lArm.shoulder.rot.x = -1.0;
                pose.rArm.shoulder.rot.x = -1.0;
                pose.spine.rot.y = t * 2.0;
            }
        } 
        else if (isAnimal) {
            pose.hips.pos.y = 0.5;
            if (state === 'WALK' || state === 'RUN') {
                const cycle = t * (state === 'RUN' ? 10.0 : 5.0);
                pose.flLeg.rot.x = Math.sin(cycle) * 0.5;
                pose.brLeg.rot.x = Math.sin(cycle) * 0.5;
                pose.frLeg.rot.x = Math.sin(cycle + Math.PI) * 0.5;
                pose.blLeg.rot.x = Math.sin(cycle + Math.PI) * 0.5;
                if(pose.tail) pose.tail.rot.z = Math.sin(cycle * 2) * 0.3;
            } else if (state === 'IDLE') {
                if(pose.tail) pose.tail.rot.z = Math.sin(t * 5) * 0.2;
                pose.neck.rot.x = Math.sin(t) * 0.05;
            } else if (state === 'HAPPY' || state === 'CELEBRATE') {
                pose.hips.pos.y = 0.5 + Math.abs(Math.sin(t*10)) * 0.3;
                if(pose.tail) pose.tail.rot.z = Math.sin(t * 20) * 0.5;
            } else if (state === 'SAD') {
                pose.neck.rot.x = -0.5;
                if(pose.tail) pose.tail.rot.x = -0.4;
            }
        }
        else if (this.mesh.userData.isPhoto) {
            // 2.5D Photo Buddy Animation
            pose.hips.pos.y = 0.5;
            if (state === 'WALK' || state === 'RUN') {
                pose.hips.pos.y = 0.5 + Math.abs(Math.sin(t * 8)) * 0.1;
                pose.spine.rot.z = Math.sin(t * 8) * 0.1;
            } else if (state === 'IDLE') {
                pose.spine.rot.x = Math.sin(t * 2) * 0.02;
            } else if (state === 'HAPPY' || state === 'CELEBRATE') {
                pose.hips.pos.y = 0.5 + Math.abs(Math.sin(t * 12)) * 0.2;
                pose.spine.rot.z = Math.sin(t * 6) * 0.2;
            } else if (state === 'SAD') {
                pose.spine.rot.x = -0.2;
                pose.hips.pos.y = 0.4;
            }
        }
        else {
            // Vehicle / Robot fallback
            if (state === 'WALK' || state === 'RUN') {
                pose.hips.pos.y = 0.5 + Math.sin(t*10)*0.05;
                if (pose.rArm && pose.lArm) {
                    pose.lArm.shoulder.rot.x = t*10;
                    pose.rArm.shoulder.rot.x = t*10;
                }
            } else if (state === 'HAPPY' || state === 'CELEBRATE') {
                pose.hips.pos.y = 0.5 + Math.abs(Math.sin(t*8))*0.4;
                pose.spine.rot.y = t*5;
            }
        }
        
        return pose;
    }

    update(dt) {
        if (!this.paused) this.time += dt * this.speed;
        this.lerpPose(dt);
    }
}
