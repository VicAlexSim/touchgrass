import { useReactMediaRecorder } from "react-media-recorder";
import { useRef, useEffect, useState, useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

const VideoPreview = ({ stream }: { stream: MediaStream | null }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      // Optimize video playback for performance
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play().catch(console.error);
        }
      };
    }
  }, [stream]);

  if (!stream) {
    return (
      <div className="w-[120px] h-[90px] bg-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center">
        <span className="text-xs text-gray-500">No Video</span>
      </div>
    );
  }

  return (
    <video 
      ref={videoRef} 
      width={120} 
      height={90} 
      autoPlay 
      muted 
      playsInline
      className="rounded-lg border-2 border-gray-300 object-cover"
      style={{ 
        transform: 'scaleX(-1)', // Mirror the video for better UX
        WebkitTransform: 'scaleX(-1)'
      }}
    />
  );
};

export function NewerWebcamMonitor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const recordingStartTimeRef = useRef<number>(0);
  
  const processChunk = useAction(api.webcam.processChunk);
  const generateUploadUrl = useMutation(api.webcam.generateUploadUrl);

  const handleVideoProcessing = useCallback(async (blob: Blob) => {
    if (isProcessing) {
      console.log("Already processing, skipping...");
      return;
    }

    // Check if video is long enough (minimum 5 seconds for TwelveLabs)
    const recordingDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
    console.log(`Recording duration: ${recordingDuration}s, blob size: ${blob.size}`);
    
    if (recordingDuration < 5 || blob.size < 10000) { // Min 5 seconds and reasonable file size
      console.log("Video too short or too small, skipping TwelveLabs processing");
      setRecordingState('idle');
      return;
    }

    setIsProcessing(true);
    setRecordingState('processing');

    try {
      console.log("Processing video chunk - duration:", recordingDuration, "size:", blob.size);
      
      // Generate upload URL
      const postUrl = await generateUploadUrl();

      // Upload to Convex storage
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`);
      }

      const { storageId } = await result.json();
      console.log("Uploaded to storage:", storageId);

      // Process with TwelveLabs (this runs asynchronously on server)
      await processChunk({ videoStorageId: storageId });

      console.log("Video processing completed successfully");
    } catch (error) {
      console.error("Error processing video chunk:", error);
    } finally {
      setIsProcessing(false);
      setRecordingState('idle');
    }
  }, [isProcessing, generateUploadUrl, processChunk]);

  const {
    startRecording,
    stopRecording,
    previewStream,
    clearBlobUrl,
  } = useReactMediaRecorder({
    video: { 
      width: 320,  // Reduced from 640 for better performance
      height: 240, // Reduced from 480 for better performance
      frameRate: 15, // Lower frame rate to reduce lag
    },
    audio: false,
    onStart: () => {
      recordingStartTimeRef.current = Date.now();
      setRecordingState('recording');
      console.log("Recording started");
    },
    onStop: (blobUrl: string, blob: Blob) => {
      console.log("Recording stopped, processing video...");
      clearBlobUrl();
      void handleVideoProcessing(blob);
    },
  });

  // Controlled recording cycle
  useEffect(() => {
    if (recordingState === 'idle' && !isProcessing) {
      // Start new recording after processing is complete
      const timer = setTimeout(() => {
        console.log("Starting new recording cycle");
        startRecording();
      }, 2000); // Increased delay to 2 seconds for better performance
      
      return () => clearTimeout(timer);
    }
  }, [recordingState, isProcessing, startRecording]);

  // 10-second recording intervals
  useEffect(() => {
    if (recordingState === 'recording') {
      // Stop recording after 10 seconds
      const timer = setTimeout(() => {
        console.log("10 seconds elapsed, stopping recording");
        stopRecording();
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [recordingState, stopRecording]);

  // Initial start - only run once on component mount
  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted && recordingState === 'idle') {
        console.log("Initial recording start");
        startRecording();
      }
    }, 500);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only run once on mount

  // const startWebcamMonitoring = () => {
  //   setIsActive(true);
  //   startRecording();
  // };

  // const stopWebcamMonitoring = () => {
  //   setIsActive(false);
  //   stopRecording();
  // };

  const getStatusText = () => {
    switch (recordingState) {
      case 'recording':
        return 'Recording...';
      case 'processing':
        return 'Analyzing with AI...';
      default:
        return 'Standby';
    }
  };

  const getStatusColor = () => {
    switch (recordingState) {
      case 'recording':
        return 'bg-red-500';
      case 'processing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <VideoPreview stream={previewStream} />
        <div className={`absolute -top-1 -right-1 w-3 h-3 ${getStatusColor()} rounded-full border-2 border-white`} />
      </div>
      <div className="text-sm">
        <div className="font-medium text-gray-900">TwelveLabs Analysis</div>
        <div className="text-gray-600">{getStatusText()}</div>
      </div>
    </div>
  );
}
