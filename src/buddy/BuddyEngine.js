import * as THREE from 'three';
export { AnimationController } from './AnimationController.js';

export class BuddyMovementController {
    constructor(mesh, domElement, camera) {
        this.mesh = mesh;
        this.domElement = domElement;
        this.camera = camera;
        
        // World position
        this.mesh.position.set(5, 0, 0); // start at right
        
        this.direction = -1; // -1 = facing left
        this.velocity = 0;
        this.targetX = null;
        this.state = 'IDLE';
        this.onTargetReached = null;
        
        // Target rotation interpolation
        this.targetRotationY = -Math.PI / 2;
    }

    walkTo(worldX, cb) {
        this.targetX = worldX;
        this.state = 'WALKING';
        this.onTargetReached = cb;
        this.faceDirection(worldX > this.mesh.position.x ? 1 : -1);
    }

    walkFromLeft() { this.mesh.position.x = -8; this.walkTo(-2); }
    walkFromRight() { this.mesh.position.x = 8; this.walkTo(2); }
    walkOffscreenLeft(cb) { this.walkTo(-8, cb); }
    walkOffscreenRight(cb) { this.walkTo(8, cb); }
    
    stopAt() { 
        this.targetX = null; 
        this.state = 'IDLE'; 
        this.velocity = 0; 
    }
    
    faceDirection(dir) {
        this.direction = dir;
        this.targetRotationY = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    }

    faceUser() {
        this.targetRotationY = 0;
    }

    syncDom() {
        if (!this.domElement || !this.camera) return;
        // Project world to screen
        const pos = this.mesh.position.clone();
        pos.project(this.camera);
        // Map to CSS (assuming full window overlay or container)
        const x = (pos.x * .5 + .5) * window.innerWidth;
        const y = (pos.y * -.5 + .5) * window.innerHeight;
        // We actually want the canvas to just track this object, but since 
        // the canvas is a set size, we move the canvas to the projected X.
        // Wait, if camera is static, and object moves, the object will go off screen.
        // If we move the object AND translate the canvas, we double-move.
        // The prompt says: "Movement must update the Three.js character/world transform. DOM should only provide transparent overlay".
        // It implies the canvas is large, or the window is large.
        // I will just use world coordinates.
    }

    update(dt) {
        // Interpolate rotation (TURN)
        const diff = this.targetRotationY - this.mesh.rotation.y;
        if (Math.abs(diff) > 0.01) {
            this.mesh.rotation.y += diff * 10 * dt;
        }

        if (this.state === 'WALKING' && this.targetX !== null) {
            const dx = this.targetX - this.mesh.position.x;
            const dist = Math.abs(dx);
            
            // Decelerate as we approach
            const speed = Math.min(3.0, dist * 5.0 + 0.5);
            
            if (dist < 0.05) {
                this.mesh.position.x = this.targetX;
                this.stopAt();
                if (this.onTargetReached) {
                    const cb = this.onTargetReached;
                    this.onTargetReached = null;
                    cb();
                }
            } else {
                this.velocity = Math.sign(dx) * speed;
                this.mesh.position.x += this.velocity * dt;
            }
        }
        
        // Sync dom if needed
        if (this.domElement && this.domElement.id === 'buddy') {
            // We use CSS translation strictly for moving the hit-box, NOT for rendering if canvas is fixed
            // Actually, if the WebGL canvas covers the whole screen, we just translate the hit-box.
            const hw = window.innerWidth / 2;
            const px = (this.mesh.position.x / 5.0) * hw + hw; 
            this.domElement.style.left = px + 'px';
        }
    }
}

export class EmotionController {
    constructor(animController) {
        this.animController = animController;
    }
    react(emotion) {
        switch(emotion.toUpperCase()) {
            case 'HAPPY': this.animController.crossFadeTo('HAPPY', 0.5); break;
            case 'SAD': this.animController.crossFadeTo('SAD', 0.5); break;
            case 'FOCUSED': this.animController.crossFadeTo('FOCUSED', 0.5); break;
            case 'CELEBRATE': this.animController.crossFadeTo('CELEBRATE', 0.5); break;
            case 'IDLE': this.animController.crossFadeTo('IDLE', 0.5); break;
        }
    }
}

export class BuddyBehaviorController {
    constructor(mesh, animController, movementController, emotionController) {
        this.mesh = mesh;
        this.anim = animController;
        this.movement = movementController;
        this.emotion = emotionController;
        
        // Queue system
        this.queue = [];
        this.isExecuting = false;
    }
    
    enqueue(action) {
        this.queue.push(action);
        this.processQueue();
    }
    
    clearQueue() {
        this.queue = [];
        this.isExecuting = false;
    }
    
    async processQueue() {
        if (this.isExecuting || this.queue.length === 0) return;
        this.isExecuting = true;
        const action = this.queue.shift();
        await action();
        this.isExecuting = false;
        this.processQueue();
    }

    idle() {
        this.movement.stopAt();
        this.anim.crossFadeTo('IDLE', 0.5);
        this.movement.faceUser();
    }

    enterScreen(cb = null) {
        this.enqueue(() => new Promise(resolve => {
            this.anim.crossFadeTo('WALK', 0.3);
            this.movement.mesh.position.x = 6;
            this.movement.walkTo(2, () => {
                this.idle();
                if(cb) cb();
                resolve();
            });
        }));
    }

    leaveScreen(toRight = true, cb = null) {
        this.enqueue(() => new Promise(resolve => {
            this.anim.crossFadeTo('WALK', 0.3);
            if (toRight) {
                this.movement.walkOffscreenRight(() => { if(cb) cb(); resolve(); });
            } else {
                this.movement.walkOffscreenLeft(() => { if(cb) cb(); resolve(); });
            }
        }));
    }

    triggerEvent(event) {
        this.clearQueue();
        if (event === 'DONE') {
            this.enqueue(() => new Promise(res => {
                this.movement.faceUser();
                this.emotion.react('HAPPY');
                setTimeout(() => { this.emotion.react('CELEBRATE'); }, 1000);
                setTimeout(() => { this.idle(); res(); }, 4000);
            }));
        } else if (event === 'MISSED') {
            this.enqueue(() => new Promise(res => {
                this.movement.stopAt();
                this.movement.faceUser();
                setTimeout(() => {
                    this.emotion.react('SAD');
                    setTimeout(() => { this.idle(); res(); }, 4000);
                }, 500);
            }));
        } else if (event === 'SNOOZE') {
            this.enqueue(() => new Promise(res => {
                this.movement.faceUser();
                this.emotion.react('FOCUSED');
                setTimeout(() => { this.idle(); res(); }, 3000);
            }));
        } else if (event === 'GOAL') {
            this.enqueue(() => new Promise(res => {
                this.anim.crossFadeTo('WALK', 0.2); // Energetic enter
                this.movement.mesh.position.x = 6;
                this.movement.walkTo(2, () => {
                    this.movement.faceUser();
                    this.emotion.react('CELEBRATE');
                    setTimeout(() => { this.idle(); res(); }, 5000);
                });
            }));
        }
    }
}