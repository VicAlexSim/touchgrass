import { useState, useRef, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export function WebcamMonitor() {
  const [isActive, setIsActive] = useState(false);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const processFrame = useAction(api.webcam.processWebcamFrame);

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsActive(true);
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
      alert("Unable to access webcam. Please check permissions.");
    }
  };

  const stopMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    setCurrentMood(null);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Process with Twelvelabs (simulated)
    processFrame({ imageData })
      .then(result => {
        setCurrentMood(result.mood);
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(captureFrame, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className="text-sm text-gray-600">
          {isActive ? 'Monitoring' : 'Inactive'}
        </span>
        {currentMood && (
          <span className="text-sm text-gray-500">
            Mood: {currentMood}
          </span>
        )}
      </div>

      <button
        onClick={isActive ? stopMonitoring : startMonitoring}
        className={`px-4 py-2 rounded-lg text-sm font-medium ${
          isActive 
            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        }`}
      >
        {isActive ? 'Stop Monitoring' : 'Start Monitoring'}
      </button>

      {/* Hidden video and canvas elements */}
      <video
        ref={videoRef}
        autoPlay
        muted
        className="hidden"
        onLoadedMetadata={() => {
          if (videoRef.current) {
            videoRef.current.play();
          }
        }}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
