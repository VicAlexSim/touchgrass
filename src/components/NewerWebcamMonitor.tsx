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
      <div className="w-[240px] h-[180px] bg-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center">
        <span className="text-sm text-gray-500">No Video</span>
      </div>
    );
  }

  return (
    <video 
      ref={videoRef} 
      width={240} 
      height={180} 
      autoPlay 
      muted 
      playsInline
      className="rounded-lg border-2 border-gray-300 object-cover shadow-lg"
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
    console.log(`Recording duration: ${recordingDuration}s, blob size: ${blob.size}, type: ${blob.type}`);
    
    if (recordingDuration < 5 || blob.size < 100000) { // Min 5 seconds and 100KB file size
      console.log("Video too short or too small, skipping TwelveLabs processing");
      setRecordingState('idle');
      return;
    }

    // Create a proper video file with duration metadata
    const videoFile = new File([blob], `webcam-${Date.now()}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`, {
      type: blob.type,
      lastModified: Date.now()
    });

    setIsProcessing(true);
    setRecordingState('processing');

    try {
      console.log("Processing video chunk - duration:", recordingDuration, "size:", videoFile.size, "type:", videoFile.type);
      
      // Generate upload URL
      const postUrl = await generateUploadUrl();

      

      // Upload to Convex storage using the video file
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": videoFile.type },
        body: videoFile,
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
    audio: false,
    video: true,
    blobPropertyBag: { type: 'video/mp4; codecs="avc1.424028"' },
    mediaRecorderOptions: {
      mimeType: 'video/mp4; codecs="avc1.424028"'
    },
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
      // Stop recording after exactly 10 seconds
      const timer = setTimeout(() => {
        const actualDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
        console.log(`Stopping recording after ${actualDuration}s`);
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
    <div className="flex flex-col gap-3">
      <div className="relative inline-block">
        <VideoPreview stream={previewStream} />
        <div className={`absolute top-2 right-2 w-4 h-4 ${getStatusColor()} rounded-full border-2 border-white shadow-lg`} />
      </div>
      <div className="text-center">
        <div className="font-medium text-gray-900">TwelveLabs AI Analysis</div>
        <div className="text-gray-600 text-sm">{getStatusText()}</div>
      </div>
    </div>
  );
}
