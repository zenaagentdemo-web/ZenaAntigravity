import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Deal } from '../types';
import { getMockCoordinates } from './mockGeocoder';
import { ConquestHUD } from './ConquestHUD';
import './LeafletTerritoryMap.css';

// CartoCDN Dark Matter - 100% FREE with attribution
const DARK_TILES_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_TILES_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface LeafletTerritoryMapProps {
    deals: Deal[];
    onDealSelect: (deal: Deal) => void;
}

// Auckland center
const DEFAULT_CENTER: [number, number] = [-36.8485, 174.7633];
const DEFAULT_ZOOM = 14;

// Neon colors for deal stages
const STAGE_COLORS: Record<string, number> = {
    'settled': 0x00ff41,      // Neon Green
    'pre_settlement': 0x00ff41,
    'unconditional': 0xffd700, // Gold
    'offer_made': 0xffd700,
    'conditional': 0xbc13fe,   // Neon Purple
    'viewings': 0xff003c,      // Neon Red
    'default': 0x00f3ff        // Cyan
};

const getStageColor = (stage: string): number => {
    return STAGE_COLORS[stage] || STAGE_COLORS['default'];
};

// Three.js Bloom Overlay Component
const BloomOverlay: React.FC<{
    deals: (Deal & { coordinates: { lat: number; lng: number } })[];
    onDealSelect: (deal: Deal) => void;
}> = ({ deals, onDealSelect: _onDealSelect }) => {
    const map = useMap();
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const composerRef = useRef<EffectComposer | null>(null);
    const markersRef = useRef<Map<string, THREE.Group>>(new Map());
    const animationFrameRef = useRef<number>(0);

    // Initialize Three.js scene
    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.offsetWidth;
        const height = container.offsetHeight;

        // Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Orthographic camera for 2D overlay
        const camera = new THREE.OrthographicCamera(
            -width / 2, width / 2,
            height / 2, -height / 2,
            0.1, 1000
        );
        camera.position.z = 100;
        cameraRef.current = camera;

        // Renderer with alpha for transparency
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.5;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Post-processing with Bloom
        const composer = new EffectComposer(renderer);

        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        // UnrealBloomPass for neon glow
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            1.5,  // strength
            0.4,  // radius
            0.85  // threshold
        );
        composer.addPass(bloomPass);
        composerRef.current = composer;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        // Animation loop
        const animate = () => {
            animationFrameRef.current = requestAnimationFrame(animate);

            // Update marker positions based on map
            updateMarkerPositions();

            // Animate markers
            const time = performance.now() * 0.001;
            markersRef.current.forEach((marker) => {
                if (marker.userData.type === 'pin') {
                    marker.position.y = marker.userData.baseY + Math.sin(time * 3 + marker.userData.phase) * 5;
                    marker.rotation.y += 0.02;
                }
            });

            composer.render();
        };
        animate();

        // Handle resize
        const handleResize = () => {
            const newWidth = container.offsetWidth;
            const newHeight = container.offsetHeight;

            camera.left = -newWidth / 2;
            camera.right = newWidth / 2;
            camera.top = newHeight / 2;
            camera.bottom = -newHeight / 2;
            camera.updateProjectionMatrix();

            renderer.setSize(newWidth, newHeight);
            composer.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameRef.current);
            renderer.dispose();
            container.removeChild(renderer.domElement);
        };
    }, []);

    // Update marker positions when map moves
    const updateMarkerPositions = () => {
        if (!map || !sceneRef.current) return;

        const container = map.getContainer();
        const centerX = container.offsetWidth / 2;
        const centerY = container.offsetHeight / 2;

        markersRef.current.forEach((marker, _dealId) => {
            const coords = marker.userData.coordinates;
            if (coords) {
                const point = map.latLngToContainerPoint([coords.lat, coords.lng]);
                marker.position.x = point.x - centerX;
                marker.position.y = -(point.y - centerY); // Invert Y for Three.js
            }
        });
    };

    // Create/update markers when deals change
    useEffect(() => {
        if (!sceneRef.current) return;

        const scene = sceneRef.current;

        // Remove old markers
        markersRef.current.forEach((marker) => {
            scene.remove(marker);
        });
        markersRef.current.clear();

        // Create new markers
        deals.forEach((deal, index) => {
            const color = getStageColor(deal.stage);
            const marker = createNeonPin(color, index * 0.5);
            marker.userData = {
                dealId: deal.id,
                coordinates: deal.coordinates,
                type: 'pin',
                baseY: 0,
                phase: index * 0.7
            };
            scene.add(marker);
            markersRef.current.set(deal.id, marker);
        });

        // Initial position update
        updateMarkerPositions();
    }, [deals, map]);

    // Listen for map movement
    useEffect(() => {
        if (!map) return;

        const onMove = () => updateMarkerPositions();
        map.on('move', onMove);
        map.on('zoom', onMove);

        return () => {
            map.off('move', onMove);
            map.off('zoom', onMove);
        };
    }, [map]);

    return (
        <div
            ref={containerRef}
            className="bloom-overlay"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1000
            }}
        />
    );
};

// Create a glowing neon pin marker
const createNeonPin = (color: number, rotationOffset: number = 0): THREE.Group => {
    const group = new THREE.Group();

    // Main sphere (top of pin)
    const sphereGeometry = new THREE.SphereGeometry(8, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.y = 12;
    group.add(sphere);

    // Inner bright core
    const coreGeometry = new THREE.SphereGeometry(4, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.y = 12;
    group.add(core);

    // Cone (pin body)
    const coneGeometry = new THREE.ConeGeometry(6, 20, 32);
    const coneMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.rotation.x = Math.PI; // Point down
    cone.position.y = -5;
    group.add(cone);

    // Ground ring
    const ringGeometry = new THREE.RingGeometry(8, 12, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -20;
    group.add(ring);

    // Vertical beam
    const beamGeometry = new THREE.CylinderGeometry(0.3, 0.3, 40, 8);
    const beamMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.4
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.y = -5;
    group.add(beam);

    group.rotation.y = rotationOffset;

    return group;
};

// Main component
export const LeafletTerritoryMap: React.FC<LeafletTerritoryMapProps> = ({ deals, onDealSelect }) => {
    // Memoize deals with coordinates
    const geoDeals = useMemo(() => {
        return deals.map(deal => ({
            ...deal,
            coordinates: getMockCoordinates(deal.id, deal.property?.address || 'unknown')
        }));
    }, [deals]);

    return (
        <div className="leaflet-territory-map">
            <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                className="leaflet-map-container"
                zoomControl={false}
                attributionControl={true}
            >
                <TileLayer
                    url={DARK_TILES_URL}
                    attribution={DARK_TILES_ATTRIBUTION}
                />
                <BloomOverlay deals={geoDeals} onDealSelect={onDealSelect} />
            </MapContainer>
            <ConquestHUD />
        </div>
    );
};

export default LeafletTerritoryMap;
