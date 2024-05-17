// src/client/ThreeScene.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { ServicesManager, HangingProtocolService, CommandsManager } from '@ohif/core';
//

const ThreeScene = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [initialCameraQuaternion] = useState(new THREE.Quaternion()); // Store initial camera orientation

  useEffect(() => {
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6F8FAF);
    const width = 248;   // Set the desired width
    const height = 850; // Set the desired height

    //scene.add(new THREE.AxesHelper(3));
    const arrowHelper = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0.25, 0xffff00)
    scene.add(arrowHelper)

    // Camera setup
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000);
    const cameraPoseData = {
      rotation: [
        [-0.38589828042561927, -0.04128506461711207, 0.9216170900130438],
        [-0.059838826908578609, 0.9980145906664457, 0.019651758473274169],
        [-0.9205986269589779, -0.04756490572310235, -0.3876025642133925]
      ],
      center: [0.7559840846079742, -1.3272634356259443, 1.2800632747776129]
    };

    const cameraAxisX = new THREE.Vector3(cameraPoseData.rotation[0][0], cameraPoseData.rotation[0][1], cameraPoseData.rotation[0][2]);
    const cameraAxisY = new THREE.Vector3(cameraPoseData.rotation[1][0], cameraPoseData.rotation[1][1], cameraPoseData.rotation[1][2]);
    const cameraAxisZ = new THREE.Vector3(cameraPoseData.rotation[2][0], cameraPoseData.rotation[2][1], cameraPoseData.rotation[2][2]);
    const cameraCenter = new THREE.Vector3(cameraPoseData.center[0], cameraPoseData.center[1], cameraPoseData.center[2]);
    // Camera setup

    camera.position.set(cameraCenter.x+1, cameraCenter.y+0.8, cameraCenter.z);

    // Set camera focal point
    const focalPoint = new THREE.Vector3();
    focalPoint.copy(cameraCenter);
    focalPoint.add(new THREE.Vector3(cameraAxisZ.x, cameraAxisZ.y, cameraAxisZ.z).multiplyScalar(1));
    camera.lookAt(focalPoint);
    // Set view up direction
    camera.up.set(-cameraAxisY.x, -cameraAxisY.y, -cameraAxisY.z);

    const h = height; // Assuming height is defined
    const fy = 833.3112; // Assuming fy is defined
    const angle = 180 / Math.PI * 2 * Math.atan2(h / 2, fy);
    camera.fov = angle;
    camera.updateProjectionMatrix();

    // Renderer setup
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current?.appendChild(renderer.domElement);

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;



    // Restrict rotation to only allow rotation around the Y-axis
    // controls.minAzimuthAngle = -Infinity; // radians: Allow rotation to negative infinity on the azimuth angle
    // controls.maxAzimuthAngle = Infinity;  // radians: Allow rotation to positive infinity on the azimuth angle
    // controls.minPolarAngle = Math.PI / 2; // radians: Set the minimum polar angle to 90 degrees (horizontal)
    // controls.maxPolarAngle = Math.PI / 2; // radians: Set the maximum polar angle to 90 degrees (horizontal)


    // Stats setup


    // Lights setup
    const light = new THREE.SpotLight();
    light.position.set(20, 20, 20);
    scene.add(light);

    // Load texture
    const textureLoader = new THREE.TextureLoader();
    renderer.setSize(width, height);
    textureLoader.load(
      'http://localhost:8000/texture.png', // Replace with your texture path
      (texture) => {
        // Load PLY model
        const loader = new PLYLoader();
        loader.load(
          'http://localhost:8000/mesh.ply', // Replace with your PLY model path
          (geometry) => {
            geometry.computeVertexNormals();
            const material = new THREE.MeshBasicMaterial({ map: texture });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(0,1,-1);
            scene.add(mesh);
          },
          (xhr) => {
            console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
          },
          (error) => {
            console.error('An error happened', error);
          }
        );
      },
      undefined,
      (error) => {
        console.error('An error happened while loading the texture', error);
      }
    );

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let currentDot = null;

    function onMouseClick(event: MouseEvent) {
      // Calculate mouse position in normalized device coordinates
      // (-1 to +1) for both components
      console.log(event.clientX , window.innerWidth, event.clientY ,window.innerHeight)
      mouse.x = ((event.clientX - (1920 - width)) / width) * 2 - 1;
      mouse.y = -((event.clientY - (932 - height)) / height) * 2 + 1;

      // Update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouse, camera);

      // Calculate objects intersecting the picking ray
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        // Get the point of intersection
        const intersectPoint = intersects[0].point;

        // If there is already a dot in the scene, remove it
        if (currentDot) {
          scene.remove(currentDot);
          currentDot.geometry.dispose();
          currentDot.material.dispose();
          currentDot = null;
        }

        // Create a smaller red sphere
        const dotGeometry = new THREE.SphereGeometry(0.01, 32, 32); // Adjust size as needed
        const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);

        // Position the red dot at the point of intersection
        dot.position.copy(intersectPoint);

        // Add the red dot to the scene and store it in currentDot
        scene.add(dot);
        currentDot = dot;
      }
    }

    // Event listeners for mouse
    window.addEventListener('click', onMouseClick);

    initialCameraQuaternion.copy(camera.quaternion);

    // Function to calculate rotation angle in degrees
    const calculateRotationAngle = () => {
      const currentQuaternion = camera.quaternion.clone();
      const relativeQuaternion = initialCameraQuaternion.clone().multiply(currentQuaternion.invert());
      const euler = new THREE.Euler().setFromQuaternion(relativeQuaternion, 'YXZ');
      let angle = THREE.MathUtils.radToDeg(euler.y);
      if (angle < 0) angle += 360; // Ensure angle is within 0 to 360 degrees
      return angle;
    };

    const changeStackIndex = (rotationAngle) => {
      // Application specific logic to map rotation angle to stack index
      const stackIndex = Math.floor(rotationAngle / 7.5);

      // Use commandsManager from OHIF Viewer to change the image
      commandsManager.runCommand('jumpToImage', { imageIndex: stackIndex });
    };

    const onRotationEnd = () => {
      const rotationAngle = calculateRotationAngle();
      changeStackIndex(rotationAngle);
      console.log(`Current Y Rotation: ${rotationAngle} degrees`); // Log the rotation angle
    };

    // Add event listeners to OrbitControls
    //controls.addEventListener('start', () => console.log('Rotation started'));
    controls.addEventListener('end', onRotationEnd);


    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      mountRef.current?.removeChild(renderer.domElement);
      window.removeEventListener('click', onMouseClick);
      //window.removeEventListener('resize', handleResize);
      controls.removeEventListener('end', onRotationEnd);
    };
  }, []);

  return <div ref={mountRef} />;
};

export default ThreeScene;
