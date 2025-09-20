import { useState, useRef, useEffect, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import * as faceapi from "face-api.js";

export function WebcamMonitor() {
  const [isActive, setIsActive] = useState(false);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const processFrame = useAction(api.webcam.processWebcamFrame);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceExpressionNet.loadFromUri('/models');
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Error loading face-api models:', error);
      }
    };

    void loadModels();
  }, []);

  const startMonitoring = async () => {
    if (!isModelLoaded) {
      alert('Face detection models are still loading. Please wait...');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
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
    setMoodScore(null);
    setFaceDetected(false);
  };

  const analyzeMoodFromExpressions = useCallback((expressions: any) => {
    const expressionValues = {
      happy: expressions.happy || 0,
      sad: expressions.sad || 0,
      angry: expressions.angry || 0,
      fearful: expressions.fearful || 0,
      disgusted: expressions.disgusted || 0,
      surprised: expressions.surprised || 0,
      neutral: expressions.neutral || 0
    };

    // Determine dominant mood
    const maxExpression = Object.entries(expressionValues).reduce((a, b) =>
      expressionValues[a[0] as keyof typeof expressionValues] > expressionValues[b[0] as keyof typeof expressionValues] ? a : b
    );

    let mood = 'neutral';
    let score = 50; // neutral score

    switch (maxExpression[0]) {
      case 'happy':
        mood = 'happy';
        score = 80 + (expressionValues.happy * 20);
        break;
      case 'sad':
        mood = 'tired';
        score = 20 + (expressionValues.sad * 30);
        break;
      case 'angry':
      case 'fearful':
        mood = 'stressed';
        score = 10 + (Math.max(expressionValues.angry, expressionValues.fearful) * 40);
        break;
      case 'neutral':
        mood = 'neutral';
        score = 50 + (expressionValues.neutral * 30);
        break;
      default:
        mood = 'neutral';
        score = 50;
    }

    return {
      mood,
      score: Math.round(Math.min(100, Math.max(0, score))),
      confidence: Math.max(...Object.values(expressionValues))
    };
  }, []);

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Clear canvas and draw video frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0);

    try {
      // Detect faces and expressions
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detections.length > 0) {
        setFaceDetected(true);
        const detection = detections[0];
        const expressions = detection.expressions;

        // Draw face detection box
        const resizedDetections = faceapi.resizeResults(detections, {
          width: canvas.width,
          height: canvas.height
        });
        faceapi.draw.drawDetections(canvas, resizedDetections);

        // Analyze expressions to determine mood
        const moodAnalysis = analyzeMoodFromExpressions(expressions);
        setCurrentMood(moodAnalysis.mood);
        setMoodScore(moodAnalysis.score);

        // Convert to base64 and send to backend
        const imageData = canvas.toDataURL('image/jpeg', 0.8);

        // Send to backend with real analysis data
        await processFrame({
          imageData,
          mood: moodAnalysis.mood,
          moodScore: moodAnalysis.score,
          isPresent: true,
          confidence: moodAnalysis.confidence
        });
      } else {
        setFaceDetected(false);
        setCurrentMood('no_face');
        setMoodScore(0);
      }
    } catch (error) {
      console.error('Face detection error:', error);
      setFaceDetected(false);
    }
  }, [analyzeMoodFromExpressions, processFrame]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => void captureFrame(), 1000); // Every 5 seconds for better responsiveness
    return () => clearInterval(interval);
  }, [isActive, captureFrame]);

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-sm text-gray-600">
            {isActive ? 'Monitoring' : 'Inactive'}
          </span>
          {!isModelLoaded && (
            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
              Loading models...
            </span>
          )}
        </div>

        <button
          onClick={isActive ? stopMonitoring : startMonitoring}
          disabled={!isModelLoaded}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            !isModelLoaded
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isActive
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {isActive ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
      </div>

      {(currentMood || faceDetected !== null) && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Face Detection:</span>
            <span className={`font-medium ${faceDetected ? 'text-green-600' : 'text-red-600'}`}>
              {faceDetected ? 'Detected' : 'No Face'}
            </span>
          </div>
          {currentMood && currentMood !== 'no_face' && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Mood:</span>
              <span className="font-medium capitalize text-gray-800">{currentMood}</span>
              {moodScore !== null && (
                <span className="text-gray-500">({moodScore}/100)</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hidden video and canvas elements */}
      <video
        ref={videoRef}
        autoPlay
        muted
        className="hidden"
        onLoadedMetadata={() => {
          if (videoRef.current) {
            void videoRef.current.play();
          }
        }}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
