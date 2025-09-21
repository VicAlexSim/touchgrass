import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import * as faceapi from "face-api.js";

interface BreakDetectionMonitorProps {
  onBreakDetected?: (isOnBreak: boolean) => void;
}

export function BreakDetectionMonitor({ onBreakDetected }: BreakDetectionMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isAtDesk, setIsAtDesk] = useState<boolean | null>(null);
  const [lastDetectionTime, setLastDetectionTime] = useState(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const updateBreakStatus = useMutation(api.webcam.updateBreakStatus);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        ]);
        setIsModelLoaded(true);
        console.log('face-api.js models loaded successfully');
      } catch (error) {
        console.error('Error loading face-api.js models:', error);
      }
    };

    loadModels();
  }, []);

  // Initialize webcam
  useEffect(() => {
    const startVideo = async () => {
      if (!videoRef.current || !isModelLoaded) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 320, 
            height: 240,
            frameRate: 10 // Lower frame rate for face detection
          } 
        });
        videoRef.current.srcObject = stream;
      } catch (error) {
        console.error('Error accessing webcam for face detection:', error);
      }
    };

    startVideo();
  }, [isModelLoaded]);

  // Face detection loop
  useEffect(() => {
    if (!isModelLoaded || !videoRef.current) return;

    const detectFaces = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        return;
      }

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        const now = Date.now();
        const hasUser = detections.length > 0;
        
        // Only update status if it changed or if it's been more than 5 seconds (for rate limiting)
        if (isAtDesk !== hasUser || now - lastDetectionTime > 5000) {
          setIsAtDesk(hasUser);
          setLastDetectionTime(now);
          
          // Notify parent component
          onBreakDetected?.(!hasUser);
          
          // Update backend with break status
          try {
            await updateBreakStatus({
              isAtDesk: hasUser,
              timestamp: now,
            });
          } catch (error) {
            console.error('Error updating break status:', error);
          }
        }
      } catch (error) {
        console.error('Error during face detection:', error);
      }
    };

    // Start detection interval - check every second for responsive break detection
    intervalRef.current = setInterval(detectFaces, 1000); // Check every 1 second

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isModelLoaded, isAtDesk, lastDetectionTime, onBreakDetected, updateBreakStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getStatusColor = () => {
    if (isAtDesk === null) return "bg-gray-500";
    return isAtDesk ? "bg-green-500" : "bg-orange-500";
  };

  const getStatusText = () => {
    if (isAtDesk === null) return "Initializing...";
    return isAtDesk ? "At Desk" : "On Break";
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {/* Hidden video for face detection processing */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="hidden"
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(console.error);
            }
          }}
        />
        
        {/* Status indicator */}
        <div className={`w-8 h-8 ${getStatusColor()} rounded-full border-2 border-white flex items-center justify-center`}>
          <div className="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>
      
      <div className="text-sm">
        <div className="font-medium text-gray-900">Break Detection</div>
        <div className="text-gray-600">{getStatusText()}</div>
        {!isModelLoaded && (
          <div className="text-xs text-gray-500">Loading models...</div>
        )}
      </div>
    </div>
  );
}
