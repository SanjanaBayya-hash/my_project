import React, { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Text,
  Sphere,
  Box,
  Cylinder,
  Cone,
  Stats,
} from "@react-three/drei";
import { motion } from "framer-motion";
import * as THREE from "three";

// Simulated energy data generator
const useEnergyData = () => {
  const [data, setData] = useState({
    solarOutput: 3.2,
    batteryLevel: 65,
    houseDemand: 2.1,
    gridUsage: 0.5,
    timeOfDay: 12,
    rlAction: "Optimizing",
    prediction: "Charging from solar",
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const newTime = (prev.timeOfDay + 0.5) % 24;
        const isDaytime = newTime >= 6 && newTime <= 18;

        const solarOutput = isDaytime
          ? 3 +
            2 * Math.sin(((newTime - 6) / 12) * Math.PI) +
            Math.random() * 0.5
          : 0;

        const houseDemand =
          1.5 +
          Math.random() * 1.5 +
          (newTime >= 18 && newTime <= 22 ? 1.5 : 0);

        const netEnergy = solarOutput - houseDemand;

        let newBatteryLevel = prev.batteryLevel;
        if (netEnergy > 0 && newBatteryLevel < 90) {
          newBatteryLevel = Math.min(90, newBatteryLevel + netEnergy * 2);
        } else if (netEnergy < 0 && newBatteryLevel > 10) {
          newBatteryLevel = Math.max(10, newBatteryLevel + netEnergy * 2);
        }

        const gridUsage =
          netEnergy < 0 && newBatteryLevel <= 15 ? Math.abs(netEnergy) : 0;

        let rlAction, prediction;
        if (solarOutput > houseDemand && newBatteryLevel < 85) {
          rlAction = "Charging";
          prediction = "Storing excess solar";
        } else if (houseDemand > solarOutput && newBatteryLevel > 20) {
          rlAction = "Discharging";
          prediction = "Using battery power";
        } else if (gridUsage > 0) {
          rlAction = "Grid Assist";
          prediction = "Supplementing from grid";
        } else {
          rlAction = "Monitoring";
          prediction = "Balanced state";
        }

        return {
          solarOutput: parseFloat(solarOutput.toFixed(2)),
          batteryLevel: parseFloat(newBatteryLevel.toFixed(1)),
          houseDemand: parseFloat(houseDemand.toFixed(2)),
          gridUsage: parseFloat(gridUsage.toFixed(2)),
          timeOfDay: newTime,
          rlAction,
          prediction,
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return data;
};

// Star field background
const StarField = () => {
  const points = useRef();

  const particlesPosition = React.useMemo(() => {
    const positions = new Float32Array(1000 * 3);
    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#334155" transparent opacity={0.6} />
    </points>
  );
};

// Animated energy flow particles
const EnergyFlow = ({ start, end, active, color = "#4ade80" }) => {
  const particlesRef = useRef([]);
  const groupRef = useRef();

  useFrame((state) => {
    if (!active || !groupRef.current) return;

    particlesRef.current.forEach((particle, i) => {
      if (particle) {
        const t = (state.clock.elapsedTime * 0.5 + i * 0.2) % 1;
        const pos = new THREE.Vector3().lerpVectors(
          new THREE.Vector3(...start),
          new THREE.Vector3(...end),
          t
        );
        particle.position.copy(pos);
        particle.material.opacity = Math.sin(t * Math.PI) * 0.8;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Sphere
          key={i}
          ref={(el) => (particlesRef.current[i] = el)}
          args={[0.08, 16, 16]}
        >
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.8}
            emissive={color}
            emissiveIntensity={2}
          />
        </Sphere>
      ))}
      <Line points={[start, end]} color={color} lineWidth={2} opacity={0.3} />
    </group>
  );
};

// Simple line component
const Line = ({ points, color, lineWidth, opacity }) => {
  const ref = useRef();

  useEffect(() => {
    if (ref.current) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(...p))
      );
      ref.current.geometry = geometry;
    }
  }, [points]);

  return (
    <line ref={ref}>
      <bufferGeometry />
      <lineBasicMaterial
        color={color}
        linewidth={lineWidth}
        transparent
        opacity={opacity}
      />
    </line>
  );
};

// Ground plane component - REMOVED for better visibility

// 3D House component
const House = ({ demand }) => {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.emissiveIntensity = 0.2 + demand * 0.1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <Box args={[2, 1.5, 2]} position={[0, 0.75, 0]}>
        <meshStandardMaterial
          color="#1e293b"
          transparent
          opacity={0.9}
          wireframe
        />
      </Box>

      <Box args={[1.9, 1.4, 1.9]} position={[0, 0.7, 0]} ref={meshRef}>
        <meshStandardMaterial
          color="#475569"
          transparent
          opacity={0.6}
          emissive="#f59e0b"
          emissiveIntensity={0.4}
        />
      </Box>

      <Cone
        args={[1.6, 1, 4]}
        position={[0, 2, 0]}
        rotation={[0, Math.PI / 4, 0]}
      >
        <meshStandardMaterial color="#6d28d9" transparent opacity={0.7} />
      </Cone>

      <Sphere args={[0.15, 16, 16]} position={[-0.5, 0.8, 1.01]}>
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={2 + demand * 0.5}
        />
      </Sphere>
      <Sphere args={[0.15, 16, 16]} position={[0.5, 0.8, 1.01]}>
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={2 + demand * 0.5}
        />
      </Sphere>
    </group>
  );
};

// Solar panel component
const SolarPanel = ({ output, timeOfDay }) => {
  const panelRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    if (panelRef.current) {
      const intensity = output > 0 ? 0.5 + output * 0.2 : 0;
      panelRef.current.material.emissiveIntensity = intensity;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(
        1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
      );
    }
  });

  const isDaytime = timeOfDay >= 6 && timeOfDay <= 18;

  return (
    <group position={[0, 3, 0]}>
      <Box args={[1.5, 0.05, 1]} rotation={[-0.3, 0, 0]} ref={panelRef}>
        <meshStandardMaterial
          color="#1e3a8a"
          metalness={0.9}
          roughness={0.1}
          emissive="#3b82f6"
          emissiveIntensity={0}
        />
      </Box>

      {isDaytime && output > 0 && (
        <>
          <Sphere args={[0.4, 16, 16]} position={[0, 1.5, 0]} ref={glowRef}>
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#fbbf24"
              emissiveIntensity={4}
              transparent
              opacity={0.8}
            />
          </Sphere>

          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <Cylinder
                key={i}
                args={[0.03, 0.03, 1.2]}
                position={[Math.cos(angle) * 0.6, 1.5, Math.sin(angle) * 0.6]}
                rotation={[0, 0, angle]}
              >
                <meshStandardMaterial
                  color="#fbbf24"
                  emissive="#fbbf24"
                  emissiveIntensity={3}
                  transparent
                  opacity={0.7}
                />
              </Cylinder>
            );
          })}
        </>
      )}
    </group>
  );
};

// Tesla Powerwall battery component
const Battery = ({ level }) => {
  const fillRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    if (fillRef.current) {
      const targetScale = level / 100;
      fillRef.current.scale.y = THREE.MathUtils.lerp(
        fillRef.current.scale.y,
        targetScale,
        0.05
      );
      fillRef.current.position.y = -0.75 + (targetScale * 1.5) / 2;

      // Color changes based on level - ALWAYS GREEN, just different shades
      const color = level > 60 ? "#22c55e" : level > 30 ? "#16a34a" : "#15803d";
      fillRef.current.material.color.set(color);
      fillRef.current.material.emissive.set(color);
      // Emissive intensity varies with activity but always visible
      fillRef.current.material.emissiveIntensity =
        0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }

    if (glowRef.current) {
      glowRef.current.material.opacity =
        0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
    }
  });

  return (
    <group position={[3.5, 0, 0]}>
      {/* Battery outer casing - always visible gray frame */}
      <Box args={[0.9, 1.6, 0.45]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#64748b"
          metalness={0.6}
          roughness={0.4}
          transparent
          opacity={0.3}
        />
      </Box>

      {/* Battery fill - ALWAYS GREEN, brightness changes with level */}
      <Box args={[0.8, 1.5, 0.4]} ref={fillRef}>
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </Box>

      {/* Tesla logo - bright white with blue glow */}
      <Sphere args={[0.2, 16, 16]} position={[0, 0.95, 0.24]}>
        <meshStandardMaterial
          color="#ffffff"
          emissive="#3b82f6"
          emissiveIntensity={1.5}
        />
      </Sphere>

      {/* Glow effect around battery */}
      <Sphere args={[0.65, 16, 16]} position={[0, 0, 0]} ref={glowRef}>
        <meshStandardMaterial
          color="#22c55e"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </Sphere>

      {/* Battery terminal */}
      <Cylinder args={[0.13, 0.13, 0.3]} position={[0, 0.92, 0]}>
        <meshStandardMaterial color="#1e293b" metalness={1} roughness={0.1} />
      </Cylinder>
    </group>
  );
};

// RL Agent visualization
const RLAgent = ({ action, prediction }) => {
  const meshRef = useRef();
  const ringRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.position.y =
        -2 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = state.clock.elapsedTime;
      ringRef.current.scale.setScalar(
        1 + Math.sin(state.clock.elapsedTime * 3) * 0.1
      );
    }
  });

  return (
    <group position={[0, -1.5, 2.5]}>
      <Sphere args={[0.35, 32, 32]} ref={meshRef}>
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#7c3aed"
          emissiveIntensity={2}
          metalness={0.9}
          roughness={0.1}
        />
      </Sphere>

      <mesh ref={ringRef}>
        <torusGeometry args={[0.55, 0.03, 16, 32]} />
        <meshStandardMaterial
          color="#9333ea"
          emissive="#9333ea"
          emissiveIntensity={1.5}
          transparent
          opacity={0.8}
        />
      </mesh>

      <Text
        position={[0, 0.75, 0]}
        fontSize={0.2}
        color="#1e293b"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {action}
      </Text>

      <Text
        position={[0, -0.75, 0]}
        fontSize={0.16}
        color="#334155"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.5}
        fontWeight="bold"
      >
        {prediction}
      </Text>
    </group>
  );
};

// Grid connection point
const GridConnection = ({ active }) => {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      // Grid is ALWAYS red, just pulses when active
      if (active) {
        meshRef.current.material.emissiveIntensity =
          1.5 + Math.sin(state.clock.elapsedTime * 4) * 0.5;
      } else {
        meshRef.current.material.emissiveIntensity = 0.6;
      }
    }
  });

  return (
    <group position={[-3.5, 0, 0]}>
      {/* Grid pole - ALWAYS RED */}
      <Cylinder args={[0.35, 0.35, 2.2]} ref={meshRef}>
        <meshStandardMaterial
          color="#dc2626"
          emissive="#dc2626"
          emissiveIntensity={active ? 2 : 0.6}
          metalness={0.6}
          roughness={0.4}
        />
      </Cylinder>

      {/* Grid label */}
      <Text
        position={[0, 1.4, 0]}
        fontSize={0.25}
        color="#991b1b"
        anchorX="center"
        fontWeight="bold"
      >
        GRID
      </Text>
    </group>
  );
};

// Main 3D Scene
const Scene = ({ data, showStats }) => {
  return (
    <>
      {showStats && <Stats />}

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        color={
          data.timeOfDay >= 6 && data.timeOfDay <= 18 ? "#fbbf24" : "#60a5fa"
        }
      />
      <pointLight
        position={[0, 5, 0]}
        intensity={1.2}
        color="#7c3aed"
        distance={10}
      />
      <spotLight
        position={[5, 5, 5]}
        angle={0.3}
        penumbra={1}
        intensity={1.5}
      />

      <color attach="background" args={["#ffffff"]} />

      <StarField />
      <House demand={data.houseDemand} />
      <SolarPanel output={data.solarOutput} timeOfDay={data.timeOfDay} />
      <Battery level={data.batteryLevel} />
      <RLAgent action={data.rlAction} prediction={data.prediction} />
      <GridConnection active={data.gridUsage > 0} />

      <EnergyFlow
        start={[0, 2.5, 0]}
        end={[3.5, 0, 0]}
        active={data.solarOutput > data.houseDemand && data.batteryLevel < 90}
        color="#4ade80"
      />

      <EnergyFlow
        start={[3.5, 0, 0]}
        end={[0, 0.5, 0]}
        active={data.houseDemand > data.solarOutput && data.batteryLevel > 15}
        color="#fbbf24"
      />

      <EnergyFlow
        start={[0, 2.5, 0]}
        end={[0, 0.5, 0]}
        active={data.solarOutput > 0 && data.batteryLevel >= 90}
        color="#4ade80"
      />

      <EnergyFlow
        start={[-3.5, 0.5, 0]}
        end={[0, 0.5, 0]}
        active={data.gridUsage > 0}
        color="#ef4444"
      />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={15}
      />
    </>
  );
};

// Main App Component
export default function App() {
  const data = useEnergyData();
  const [autoRotate, setAutoRotate] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const takeScreenshot = () => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "tesla-powerwall-viz.png";
      link.href = image;
      link.click();
    }
  };

  return (
    <div className="w-full h-screen bg-white relative overflow-hidden">
      <Canvas
        camera={{ position: [8, 5, 8], fov: 50 }}
        style={{ height: "100vh" }}
      >
        <Suspense fallback={null}>
          <Scene data={data} showStats={showStats} />
        </Suspense>
        <OrbitControls autoRotate={autoRotate} autoRotateSpeed={0.5} />
      </Canvas>

      {/* Compact UI Overlay - Top Right */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-purple-500/30 w-64"
        >
          <h1 className="text-lg font-bold text-white mb-2">
            🔋 Tesla Powerwall AI
          </h1>

          <div className="space-y-1 text-sm">
            <DataRow
              icon="☀️"
              label="Solar"
              value={`${data.solarOutput} kW`}
              color="text-green-400"
            />
            <DataRow
              icon="🔋"
              label="Battery"
              value={`${data.batteryLevel}%`}
              color="text-yellow-400"
            />
            <DataRow
              icon="🏠"
              label="Demand"
              value={`${data.houseDemand} kW`}
              color="text-blue-400"
            />
            <DataRow
              icon="⚡"
              label="Grid"
              value={`${data.gridUsage} kW`}
              color={data.gridUsage > 0 ? "text-red-400" : "text-gray-400"}
            />
          </div>

          <div className="mt-2 p-2 bg-purple-900/40 rounded border border-purple-500/30 text-xs">
            <div className="text-purple-300 font-semibold">
              🧠 {data.rlAction}
            </div>
            <div className="text-purple-200 text-xs">{data.prediction}</div>
          </div>

          <div className="mt-2 space-y-1 pointer-events-auto">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs py-1.5 px-2 rounded transition"
            >
              {autoRotate ? "⏸️ Stop Rotation" : "▶️ Auto Rotate"}
            </button>
            <button
              onClick={takeScreenshot}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs py-1.5 px-2 rounded transition"
            >
              📸 Screenshot
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-2 rounded transition"
            >
              {showStats ? "📊 Hide Stats" : "📊 Show Stats"}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Instructions - Bottom Left */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-2 text-xs text-slate-300 pointer-events-none">
        <div>🖱️ Drag to rotate | 🔍 Scroll to zoom</div>
        <div>⏰ Time: {Math.floor(data.timeOfDay)}:00</div>
      </div>

      {/* Energy Flow Legend - Bottom Right */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-2 text-xs text-slate-300 pointer-events-none">
        <div className="font-bold mb-1">Energy Flow:</div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          <span>Solar Energy</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
          <span>Battery Power</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400"></span>
          <span>Grid Power</span>
        </div>
      </div>
    </div>
  );
}

// Helper component for compact data rows
const DataRow = ({ icon, label, value, color }) => (
  <div className="flex items-center justify-between">
    <span className="flex items-center gap-1">
      <span>{icon}</span>
      <span className="text-slate-400">{label}:</span>
    </span>
    <span className={`font-bold ${color}`}>{value}</span>
  </div>
);
