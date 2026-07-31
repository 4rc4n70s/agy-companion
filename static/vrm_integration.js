import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
let currentVrm = undefined;
let renderer, scene, camera;
let canvas;
let animationFrameId = null;

// Global settings state
window.vrmTalkingVolume = 0;
window.vrmSetTalking = function(val) {
    window.vrmTalkingVolume = val;
};
window.vrmMixer = null;
window.vrmIsAnimating = false;

export function loadMixamoAnimation(url, vrm) {
    const loader = new FBXLoader();
    loader.load(url, (fbx) => {
        const clip = fbx.animations[0];
        if (!clip) return;
        
        const mixamoVRMRigMap = {
            mixamorigHips: 'hips',
            mixamorigSpine: 'spine',
            mixamorigSpine1: 'chest',
            mixamorigSpine2: 'upperChest',
            mixamorigNeck: 'neck',
            mixamorigHead: 'head',
            mixamorigLeftShoulder: 'leftShoulder',
            mixamorigLeftArm: 'leftUpperArm',
            mixamorigLeftForeArm: 'leftLowerArm',
            mixamorigLeftHand: 'leftHand',
            mixamorigRightShoulder: 'rightShoulder',
            mixamorigRightArm: 'rightUpperArm',
            mixamorigRightForeArm: 'rightLowerArm',
            mixamorigRightHand: 'rightHand',
            mixamorigLeftUpLeg: 'leftUpperLeg',
            mixamorigLeftLeg: 'leftLowerLeg',
            mixamorigLeftFoot: 'leftFoot',
            mixamorigLeftToeBase: 'leftToes',
            mixamorigRightUpLeg: 'rightUpperLeg',
            mixamorigRightLeg: 'rightLowerLeg',
            mixamorigRightFoot: 'rightFoot',
            mixamorigRightToeBase: 'rightToes',
            mixamorigLeftHandThumb1: 'leftThumbProximal',
            mixamorigLeftHandThumb2: 'leftThumbIntermediate',
            mixamorigLeftHandThumb3: 'leftThumbDistal',
            mixamorigLeftHandIndex1: 'leftIndexProximal',
            mixamorigLeftHandIndex2: 'leftIndexIntermediate',
            mixamorigLeftHandIndex3: 'leftIndexDistal',
            mixamorigLeftHandMiddle1: 'leftMiddleProximal',
            mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
            mixamorigLeftHandMiddle3: 'leftMiddleDistal',
            mixamorigLeftHandRing1: 'leftRingProximal',
            mixamorigLeftHandRing2: 'leftRingIntermediate',
            mixamorigLeftHandRing3: 'leftRingDistal',
            mixamorigLeftHandPinky1: 'leftLittleProximal',
            mixamorigLeftHandPinky2: 'leftLittleIntermediate',
            mixamorigLeftHandPinky3: 'leftLittleDistal',
            mixamorigRightHandThumb1: 'rightThumbProximal',
            mixamorigRightHandThumb2: 'rightThumbIntermediate',
            mixamorigRightHandThumb3: 'rightThumbDistal',
            mixamorigRightHandIndex1: 'rightIndexProximal',
            mixamorigRightHandIndex2: 'rightIndexIntermediate',
            mixamorigRightHandIndex3: 'rightIndexDistal',
            mixamorigRightHandMiddle1: 'rightMiddleProximal',
            mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
            mixamorigRightHandMiddle3: 'rightMiddleDistal',
            mixamorigRightHandRing1: 'rightRingProximal',
            mixamorigRightHandRing2: 'rightRingIntermediate',
            mixamorigRightHandRing3: 'rightRingDistal',
            mixamorigRightHandPinky1: 'rightLittleProximal',
            mixamorigRightHandPinky2: 'rightLittleIntermediate',
            mixamorigRightHandPinky3: 'rightLittleDistal'
        };

        const tracks = [];
        clip.tracks.forEach((track) => {
            const trackSplitted = track.name.split('.');
            const mixamoRigName = trackSplitted[0];
            const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
            
            if (vrmBoneName) {
                const vrmNode = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
                if (vrmNode) {
                    const trackName = vrmNode.name + '.' + trackSplitted[1];
                    let newTrack;
                    
                    if (track instanceof THREE.QuaternionKeyframeTrack) {
                        newTrack = new THREE.QuaternionKeyframeTrack(trackName, track.times, track.values);
                    } else if (track instanceof THREE.VectorKeyframeTrack) {
                        // Keep position only for hips to retain body movement
                        if (vrmBoneName === 'hips') {
                            const values = track.values.map(v => v * 0.01);
                            newTrack = new THREE.VectorKeyframeTrack(trackName, track.times, values);
                        }
                    }
                    if (newTrack) tracks.push(newTrack);
                }
            }
        });

        const newClip = new THREE.AnimationClip(clip.name, clip.duration, tracks);
        
        if (window.vrmMixer) {
            window.vrmMixer.stopAllAction();
            window.vrmMixer.uncacheRoot(window.vrmMixer.getRoot());
        }
        
        window.vrmMixer = new THREE.AnimationMixer(vrm.scene);
        const action = window.vrmMixer.clipAction(newClip);
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        
        window.vrmIsAnimating = true;
        action.play();
        
        window.vrmMixer.addEventListener('finished', () => {
            window.vrmIsAnimating = false;
        });
    });
}

export async function loadVRMModel(modelUrl) {
    if (!scene) return;
    
    // Remove old vrm
    if (currentVrm) {
        scene.remove(currentVrm.scene);
        if (typeof currentVrm.dispose === 'function') {
            currentVrm.dispose();
        }
        currentVrm = undefined;
    }

    const loader = new GLTFLoader();
    loader.crossOrigin = 'anonymous';
    loader.register((parser) => new VRMLoaderPlugin(parser));
    
    const loadingOverlay = document.getElementById('vrm-loading-overlay');
    const loadingBar = document.getElementById('vrm-loading-bar');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    if (loadingBar) loadingBar.style.width = '0%';

    loader.load(
        modelUrl,
        (gltf) => {
            const vrm = gltf.userData.vrm;
            VRMUtils.removeUnnecessaryVertices(gltf.scene);
            VRMUtils.removeUnnecessaryJoints(gltf.scene);
            scene.add(vrm.scene);
            currentVrm = vrm;
            
            // Face the camera
            // Note: three-vrm automatically makes models face +Z (towards camera).
            // Do NOT rotate vrm.scene.rotation.y = Math.PI here, it will face backwards.
            vrm.scene.rotation.y = (window.vrmRotation || 180) * (Math.PI / 180);
            
            if (window.vrmArmsDown !== undefined && vrm.humanoid) {
                const left = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
                const right = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
                if (left) left.rotation.z = window.vrmArmsDown;
                if (right) right.rotation.z = -window.vrmArmsDown;
            }
            
            vrm.scene.position.y = window.vrmCameraOffsetY !== undefined ? window.vrmCameraOffsetY : -0.2;
            
            if (camera && window.vrmCameraZoom !== undefined) {
                camera.position.z = window.vrmCameraZoom;
            }
            
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            
            // Trigger default greeting animation (VRMA_02) after a short delay
            setTimeout(() => {
                if (window.vrmController && window.vrmController.playAnimation) {
                    window.vrmController.playAnimation('/static/animations/VRMA_02.vrma');
                }
            }, 500);
        },
        (progress) => {
            if (progress.total > 0 && loadingBar) {
                const percent = (progress.loaded / progress.total) * 100;
                loadingBar.style.width = percent + '%';
            }
        },
        (error) => {
            console.error('Error loading VRM:', error);
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    );
}

export function initVRM() {
    const avatarCircle = document.querySelector('.avatar-circle');
    if (!avatarCircle) return;
    
    // Create canvas if it doesn't exist
    if (!document.getElementById('vrm-canvas')) {
        canvas = document.createElement('canvas');
        canvas.id = 'vrm-canvas';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '10';
        canvas.style.borderRadius = 'inherit'; 
        avatarCircle.appendChild(canvas);
    } else {
        canvas = document.getElementById('vrm-canvas');
        canvas.style.display = 'block';
    }

    const charImg = document.getElementById('character-image');
    if (charImg) charImg.style.opacity = '0'; 
    
    avatarCircle.classList.add('vtuber-mode');

    if (!renderer) {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        const rect = avatarCircle.getBoundingClientRect();
        renderer.setSize(rect.width, rect.height, false);
        renderer.setPixelRatio(window.devicePixelRatio);

        camera = new THREE.PerspectiveCamera(30.0, rect.width / rect.height, 0.1, 20.0);
        camera.position.set(0.0, 1.4, 0.9); // Y=1.4 to center on face, Z=0.9 for comfortable framing
        camera.lookAt(0, 1.3, 0); // Aim slightly below the face to frame shoulders

        scene = new THREE.Scene();

        const light = new THREE.DirectionalLight(0xffffff, 1.2);
        light.position.set(1.0, 1.0, 1.0).normalize();
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        const clock = new THREE.Clock();
        let targetLookAt = new THREE.Vector2();

        window.addEventListener('mousemove', (event) => {
            targetLookAt.x = 2.0 * (event.clientX / window.innerWidth) - 1.0;
            targetLookAt.y = -2.0 * (event.clientY / window.innerHeight) + 1.0;
        });

        let currentMouthOpen = 0;

        function animate() {
            animationFrameId = requestAnimationFrame(animate);
            const deltaTime = clock.getDelta();

            if (currentVrm) {
                currentVrm.update(deltaTime);

                if (currentVrm.lookAt) {
                    currentVrm.lookAt.applier.yaw = targetLookAt.x * 20;
                    currentVrm.lookAt.applier.pitch = targetLookAt.y * 20;
                }
                
                if (window.vrmMixer && window.vrmIsAnimating) {
                    window.vrmMixer.update(deltaTime);
                } else {
                    // --- Procedural Idle Animation (Breathing & Swaying) ---
                    const time = Date.now() / 1000;
                    
                    // Slight spine rotation for a natural swaying motion
                    const spine = currentVrm.humanoid.getNormalizedBoneNode('spine');
                    if (spine) {
                        spine.rotation.y = Math.sin(time * 0.8) * 0.03;
                        spine.rotation.x = Math.sin(time * 1.2) * 0.01;
                    }
                    
                    // Head tilt
                    const head = currentVrm.humanoid.getNormalizedBoneNode('head');
                    if (head) {
                        head.rotation.z = Math.sin(time * 0.9) * 0.02;
                    }
                    
                    // Arms floating slightly with breathing
                    const leftArm = currentVrm.humanoid.getNormalizedBoneNode('leftUpperArm');
                    const rightArm = currentVrm.humanoid.getNormalizedBoneNode('rightUpperArm');
                    
                    const baseArmAngle = window.vrmArmsDown !== undefined ? window.vrmArmsDown : 0.0;
                    
                    if (leftArm) leftArm.rotation.z = baseArmAngle + Math.sin(time * 1.5) * 0.03;
                    if (rightArm) rightArm.rotation.z = -baseArmAngle - Math.sin(time * 1.5) * 0.03;
                    // -------------------------------------------------------
                }

                if (currentVrm.expressionManager) {
                    // Smooth lip sync
                    const targetMouthOpen = window.vrmTalkingVolume || 0;
                    currentMouthOpen += (targetMouthOpen - currentMouthOpen) * 35 * deltaTime;
                    currentVrm.expressionManager.setValue('aa', currentMouthOpen);
                    
                    if (window.vrmTalkingVolume === 0) {
                        const blink = Math.sin(Date.now() / 500) > 0.97 ? 1 : 0;
                        currentVrm.expressionManager.setValue('blink', blink);
                    } else {
                        currentVrm.expressionManager.setValue('blink', 0);
                    }
                    currentVrm.expressionManager.update();
                }
            }
            renderer.render(scene, camera);
        }
        animate();

        // Use ResizeObserver to adapt to CSS transitions
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                    renderer.setSize(width, height, false);
                }
            }
        });
        resizeObserver.observe(avatarCircle);
    }
}

export function disableVRM() {
    const avatarCircle = document.querySelector('.avatar-circle');
    if (avatarCircle) {
        avatarCircle.classList.remove('vtuber-mode');
    }
    
    if (canvas) {
        canvas.style.display = 'none';
    }
    
    const charImg = document.getElementById('character-image');
    if (charImg) charImg.style.opacity = '1'; 
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    if (renderer) {
        renderer.dispose();
        renderer = null;
        scene = null;
        camera = null;
        currentVrm = null;
    }
}

export function loadVRMAAnimation(url, vrm) {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    
    loader.load(url, (gltf) => {
        const vrmAnimations = gltf.userData.vrmAnimations;
        if (!vrmAnimations || vrmAnimations.length === 0) return;
        
        const vrmAnimation = vrmAnimations[0];
        const clip = createVRMAnimationClip(vrmAnimation, vrm);
        
        if (window.vrmMixer) {
            window.vrmMixer.stopAllAction();
        } else {
            window.vrmMixer = new THREE.AnimationMixer(vrm.scene);
        }
        
        const action = window.vrmMixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.play();
        
        window.vrmIsAnimating = true;
        
        if (window.vrmAnimTimeout) {
            clearTimeout(window.vrmAnimTimeout);
        }
        
        // Return to idle state when animation finishes based on clip duration
        window.vrmAnimTimeout = setTimeout(() => {
            action.stop();
            if (vrm.humanoid) {
                vrm.humanoid.resetRestPose();
            }
            window.vrmIsAnimating = false;
        }, clip.duration * 1000);
    }, undefined, (error) => {
        console.error('Error loading VRMA animation:', error);
    });
}

// Background idle animation loop
setInterval(() => {
    // Only play if model is loaded, not currently animating, and not talking
    if (!currentVrm || window.vrmIsAnimating || (window.vrmTalkingVolume !== undefined && window.vrmTalkingVolume > 0.05)) {
        return;
    }
    
    // Choose a random animation, excluding the greeting (VRMA_02)
    const genericAnimations = [
        '/static/animations/VRMA_01.vrma',
        '/static/animations/VRMA_03.vrma',
        '/static/animations/VRMA_04.vrma',
        '/static/animations/VRMA_05.vrma',
        '/static/animations/VRMA_06.vrma',
        '/static/animations/VRMA_07.vrma'
    ];
    
    const randomAnim = genericAnimations[Math.floor(Math.random() * genericAnimations.length)];
    if (window.vrmController && window.vrmController.playAnimation) {
        window.vrmController.playAnimation(randomAnim);
    }
}, 20000);

window.vrmController = {
    init: initVRM,
    loadModel: loadVRMModel,
    disable: disableVRM,
    playAnimation: (url) => {
        if (!currentVrm) return;
        if (url.endsWith('.vrma')) {
            loadVRMAAnimation(url, currentVrm);
        } else {
            loadMixamoAnimation(url, currentVrm);
        }
    },
    setCamera: (y, z) => {
        window.vrmCameraOffsetY = y;
        window.vrmCameraZoom = z;
        if (currentVrm) {
            currentVrm.scene.position.y = y;
        }
        if (camera) {
            camera.position.z = z;
        }
    },
    setRotation: (angleDeg) => {
        window.vrmRotation = angleDeg;
        if (currentVrm) {
            currentVrm.scene.rotation.y = angleDeg * (Math.PI / 180);
        }
    },
    setArmsDown: (armAngle) => {
        window.vrmArmsDown = armAngle;
        if (currentVrm && currentVrm.humanoid) {
            const left = currentVrm.humanoid.getNormalizedBoneNode('leftUpperArm');
            const right = currentVrm.humanoid.getNormalizedBoneNode('rightUpperArm');
            if (left) left.rotation.z = armAngle;
            if (right) right.rotation.z = -armAngle;
        }
    }
};
