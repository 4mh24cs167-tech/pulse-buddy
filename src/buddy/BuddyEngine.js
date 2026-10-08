import * as THREE from 'three';
export { AnimationController } from './AnimationController.js';

export class BuddyMovementController {
    constructor(mesh, domElement) {
        this.mesh = mesh;
        this.domElement = domElement;
        this.x = 100; // start 100px from right edge
        this.y = 20; // 20px bottom
        this.scale = 1;
        this.rotation = 0;
        this.direction = -1; // -1 = facing left
        this.velocity = 0;
        this.targetX = null;
        this.targetY = null;
        this.state = 'IDLE'; // IDLE, WALKING, REACTING
        this.onTargetReached = null;
    }

    walkTo(x, y, cb) {
        this.targetX = x;
        this.targetY = y;
        this.state = 'WALKING';
        this.onTargetReached = cb;
        this.faceDirection(x > this.x ? 1 : -1);
    }

    walkFromLeft() { this.x = -200; this.updateDom(); this.walkTo(100, 20); }
    walkFromRight() { this.x = window.innerWidth + 200; this.updateDom(); this.walkTo(window.innerWidth - 300, 20); }
    walkOffscreenLeft(cb) { this.walkTo(-300, 20, cb); }
    walkOffscreenRight(cb) { this.walkTo(window.innerWidth + 300, 20, cb); }
    stopAt() { this.targetX = null; this.targetY = null; this.state = 'IDLE'; this.velocity = 0; }
    
    faceDirection(dir) {
        this.direction = dir;
        if(this.mesh) this.mesh.rotation.y = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    }

    updateDom() {
        if (!this.domElement) return;
        this.domElement.style.transform = `translate3d(${this.x}px, ${-this.y}px, 0)`;
    }

    update(dt) {
        if (this.state === 'WALKING' && this.targetX !== null) {
            const dx = this.targetX - this.x;
            const dist = Math.abs(dx);
            if (dist < 5.0) {
                this.x = this.targetX;
                this.stopAt();
                this.updateDom();
                if (this.onTargetReached) {
                    const cb = this.onTargetReached;
                    this.onTargetReached = null;
                    cb();
                }
            } else {
                // Ease in/out or linear velocity
                this.velocity = Math.sign(dx) * 150.0; // pixels per second
                this.x += this.velocity * dt;
                this.updateDom();
            }
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
    }

    idle() {
        this.movement.stopAt();
        this.anim.crossFadeTo('IDLE', 0.5);
        this.movement.mesh.rotation.y = 0; // face user
    }

    enterScreen(cb = null) {
        this.anim.crossFadeTo('WALK', 0.3);
        // By default come from right
        this.movement.x = window.innerWidth + 200;
        this.movement.updateDom();
        this.movement.walkTo(window.innerWidth - 300, 20, () => {
            this.idle();
            if (cb) cb();
        });
    }

    leaveScreen(toRight = true, cb = null) {
        this.anim.crossFadeTo('WALK', 0.3);
        if (toRight) {
            this.movement.walkOffscreenRight(cb);
        } else {
            this.movement.walkOffscreenLeft(cb);
        }
    }

    triggerEvent(event) {
        if (event === 'DONE') {
            this.movement.mesh.rotation.y = 0; // face user
            this.emotion.react('HAPPY');
            setTimeout(() => this.idle(), 3000);
        } else if (event === 'MISSED') {
            this.movement.stopAt();
            this.movement.mesh.rotation.y = Math.PI / 4; // look away
            this.emotion.react('SAD');
            setTimeout(() => this.idle(), 4000);
        } else if (event === 'SNOOZE') {
            this.movement.mesh.rotation.y = 0;
            this.emotion.react('FOCUSED');
            setTimeout(() => this.idle(), 3000);
        } else if (event === 'GOAL') {
            this.movement.mesh.rotation.y = 0;
            this.emotion.react('CELEBRATE');
            setTimeout(() => this.idle(), 5000);
        }
    }
}
