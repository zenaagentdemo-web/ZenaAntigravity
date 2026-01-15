import React, { useEffect, useRef } from 'react';

interface MissionStatusWidgetProps {
    currentTask?: string;
    nextTaskTime?: Date;
    isActive: boolean;
    onPipRequest?: () => void;
}

export const MissionStatusWidget: React.FC<MissionStatusWidgetProps> = ({
    currentTask = "Optimizing Route...",
    nextTaskTime,
    isActive,
    onPipRequest
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Draw to canvas loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrame: number;

        const draw = () => {
            // Clear
            ctx.fillStyle = '#0f172a'; // Slate-900
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Background Pulse for 'Active' state
            if (isActive) {
                const time = Date.now() / 1000;
                const alpha = 0.1 + Math.sin(time * 2) * 0.05;
                ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`; // Violet
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Header
            ctx.fillStyle = '#a78bfa'; // Violet-400
            ctx.font = 'bold 24px Inter, sans-serif';
            ctx.fillText('ZENA MISSION CONTROL', 20, 40);

            // Current Task
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px Inter, sans-serif';
            const taskText = currentTask.length > 25 ? currentTask.substring(0, 25) + '...' : currentTask;
            ctx.fillText(taskText, 20, 100);

            // ETA / Next Task Time
            if (nextTaskTime) {
                ctx.fillStyle = '#38bdf8'; // Sky-400
                ctx.font = '24px Inter, sans-serif';
                const timeStr = nextTaskTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const timeLeft = Math.max(0, Math.floor((nextTaskTime.getTime() - Date.now()) / 60000));
                ctx.fillText(`Next: ${timeStr} (${timeLeft}m)`, 20, 140);
            }

            // Status Indicator
            if (isActive) {
                ctx.fillStyle = '#4ade80'; // Green-400
                ctx.beginPath();
                ctx.arc(canvas.width - 30, 30, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#4ade80';
                ctx.font = '14px Inter, sans-serif';
                ctx.fillText('LIVE', canvas.width - 70, 35);
            } else {
                ctx.fillStyle = '#fbbf24'; // Amber-400
                ctx.font = 'bold 20px Inter, sans-serif';
                ctx.fillText('TAP TO RESUME', 20, canvas.height - 30);
            }

            animationFrame = requestAnimationFrame(draw);
        };

        draw();

        return () => cancelAnimationFrame(animationFrame);
    }, [currentTask, nextTaskTime, isActive]);

    // Stream canvas to video for PiP
    useEffect(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (canvas && video && video.paused) {
            const stream = canvas.captureStream(30);
            video.srcObject = stream;
            video.play().catch(e => console.log("Video play failed (normal if generic):", e));
        }
    }, []);

    const handlePopOut = async () => {
        if (videoRef.current) {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await videoRef.current.requestPictureInPicture();
                }
            } catch (e) {
                console.error("PiP failed:", e);
            }
        }
    };

    return (
        <div className="mission-status-widget" style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.9)',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backdropFilter: 'blur(10px)'
        }}>
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
                Mission Active
            </div>
            <button
                onClick={handlePopOut}
                style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                }}
            >
                Launch Mini-Player 📺
            </button>

            {/* Hidden Source Elements */}
            <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px', overflow: 'hidden' }}>
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={200}
                    style={{ border: '1px solid #333', background: '#000' }}
                />
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    loop
                />
            </div>
        </div>
    );
};
