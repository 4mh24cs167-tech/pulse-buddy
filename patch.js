const fs = require('fs');
let code = fs.readFileSync('buddy3d.js', 'utf8');

const gens = `
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
`;
code = code.replace('class BuddyViewer', gens + 'class BuddyViewer');

code = code.replace(/if \(typeof id === 'object'\) \{[\s\S]*?else model = VehicleGenerator\.generate\(id\);\s*\}/, `
            let isObj = typeof id === 'object';
            let cat = isObj ? id.species : null;
            let idNum = isObj ? null : id;
            if (cat === 'human' || (idNum !== null && idNum < 18)) model = HumanGenerator.generate(id);
            else if (cat === 'animal' || (idNum !== null && idNum < 42)) model = AnimalGenerator.generate(id);
            else if (cat === 'vehicle' || (idNum !== null && idNum < 54)) model = VehicleGenerator.generate(id);
            else if (cat === 'robot' || (idNum !== null && idNum < 64)) model = RobotGenerator.generate(id);
            else model = FantasyGenerator.generate(id);
`);

code = code.replace(/if \(config\.species === 'human'\) model = HumanGenerator\.generate\(config\);\s*else if \(config\.species === 'animal'\) model = AnimalGenerator\.generate\(config\);\s*else model = VehicleGenerator\.generate\(config\);/, `
          let isObj2 = typeof config === 'object';
          let cat2 = isObj2 ? config.species : null;
          let idNum2 = isObj2 ? null : config;
          if (cat2 === 'human' || (idNum2 !== null && idNum2 < 18)) model = HumanGenerator.generate(config);
          else if (cat2 === 'animal' || (idNum2 !== null && idNum2 < 42)) model = AnimalGenerator.generate(config);
          else if (cat2 === 'vehicle' || (idNum2 !== null && idNum2 < 54)) model = VehicleGenerator.generate(config);
          else if (cat2 === 'robot' || (idNum2 !== null && idNum2 < 64)) model = RobotGenerator.generate(config);
          else model = FantasyGenerator.generate(config);
`);

fs.writeFileSync('buddy3d.js', code);
