import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Deal } from '../types';

interface Map3DOverlayProps {
    map: google.maps.Map | null;
    deals: (Deal & { coordinates: { lat: number, lng: number } })[];
    onDealSelect: (deal: Deal) => void;
}

// Helper component to perform the projection logic per frame
const Markers = ({ map, deals, onDealSelect }: Map3DOverlayProps) => {
    const refs = useRef<{ [key: string]: THREE.Group }>({});

    useFrame(() => {
        if (!map) return;

        const projection = map.getProjection();
        if (!projection) return;

        const zoom = map.getZoom() || 0;
        const center = map.getCenter();
        if (!center) return;

        const scale = Math.pow(2, zoom);
        const centerPoint = projection.fromLatLngToPoint(center);
        if (!centerPoint) return;

        // Sync positions
        deals.forEach(deal => {
            const group = refs.current[deal.id];
            if (group) {
                const latLng = new google.maps.LatLng(deal.coordinates.lat, deal.coordinates.lng);
                const worldPoint = projection.fromLatLngToPoint(latLng);

                if (worldPoint) {
                    const x = (worldPoint.x - centerPoint.x) * scale;
                    const y = (worldPoint.y - centerPoint.y) * scale;

                    // Invert Y for correct screen mapping from center
                    group.position.set(x, -y, 0);

                    const scaleFactor = 1;
                    group.scale.setScalar(scaleFactor);
                    group.visible = true;
                }
            }
        });
    });

    return (
        <>
            {deals.map(deal => (
                <group key={deal.id} ref={el => { if (el) refs.current[deal.id] = el; }}>
                    <ConquestMarker deal={deal} onClick={() => onDealSelect(deal)} />
                </group>
            ))}
        </>
    );
};

// The 3D Marker visual matching the "Neon Pin" reference
const ConquestMarker = ({ deal, onClick }: { deal: Deal, onClick: () => void }) => {
    const groupRef = useRef<THREE.Group>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    // Neon Colors from reference
    const color = useMemo(() => {
        if (deal.stage === 'settled') return '#00ff41'; // Bright Neon Green
        if (deal.stage === 'offer_made') return '#ffd700'; // Gold
        if (deal.stage === 'conditional') return '#bc13fe'; // Neon Purple
        if (deal.stage === 'viewings') return '#ff003c'; // Neon Red
        return '#00f3ff'; // Cyan default
    }, [deal.stage]);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        if (groupRef.current) {
            // Gentle bobbing
            groupRef.current.position.y = Math.sin(time * 3) * 5 + 10;
        }
        if (ringRef.current) {
            // Pulsing ring
            const scale = 1 + Math.sin(time * 4) * 0.2;
            ringRef.current.scale.set(scale, scale, 1);
            ringRef.current.rotation.z -= 0.02;
        }
    });

    return (
        <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* The Pin Shape: A Cone pointing down + Sphere on top */}
            <group rotation={[0, 0, 0]}>
                {/* Top Sphere */}
                <mesh position={[0, 12, 0]}>
                    <sphereGeometry args={[8, 32, 32]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={2.5}
                        toneMapped={false}
                        roughness={0.2}
                        metalness={1}
                    />
                </mesh>

                {/* Cone Body */}
                <mesh position={[0, 0, 0]}>
                    <coneGeometry args={[6, 20, 32]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={1.5}
                        transparent
                        opacity={0.9}
                    />
                </mesh>

                {/* Inner White Core for "Hot" look */}
                <mesh position={[0, 12, 0]}>
                    <sphereGeometry args={[4, 16, 16]} />
                    <meshBasicMaterial color="#ffffff" />
                </mesh>
            </group>

            {/* Ground ripples / target lock effect */}
            <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -20, 0]}>
                <ringGeometry args={[8, 12, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>

            {/* Vertical Laser Beam to ground */}
            <mesh position={[0, -5, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 40, 8]} />
                <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
            </mesh>
        </group>
    );
};

export const Map3DOverlay: React.FC<Map3DOverlayProps> = (props) => {
    if (!props.map) return null;

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
            <Canvas
                orthographic
                camera={{ zoom: 1, position: [0, 0, 100] }}
                gl={{ alpha: true, antialias: true }}
                style={{ pointerEvents: 'none' }}
                onCreated={({ gl }) => {
                    gl.outputColorSpace = THREE.SRGBColorSpace;
                }}
            >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                <group>
                    {/* Scene wrapper just calls Markers */}
                    <Markers {...props} />
                </group>

            </Canvas>
        </div>
    );
};
