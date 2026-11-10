'use client';

/** Soft blue layers give the headline depth without decorative architecture. */
export default function CinematicScene() {
  return (
    <div className="lens-scene" aria-hidden="true">
      <div className="lens-scene-stage">
        <div className="scene-blue-glow" />
        <div className="scene-blue-wave scene-blue-wave-far" />
        <div className="scene-blue-wave scene-blue-wave-near" />
        <div className="scene-blue-highlight" />
      </div>
    </div>
  );
}
