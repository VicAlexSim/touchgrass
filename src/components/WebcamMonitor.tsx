import Webcam from "react-webcam";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export function WebcamMonitor() {
  const webcamRef = useRef<Webcam | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [capturing, setCapturing] = useState(false);
  const processChunk = useAction(api.webcam.processChunk);
  const generateUploadUrl = useMutation(api.webcam.generateUploadUrl);

  const analyzeWebcamClip = useCallback(
    async (videoFile: Blob) => {
      // Step 1: Get a short-lived upload URL
      const postUrl = await generateUploadUrl();
      // Step 2: POST the file to the URL
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": videoFile.type },
        body: videoFile,
      });
      const { storageId } = await result.json();
      void processChunk({ videoStorageId: storageId });
    },
    [processChunk]
  );

  const handleDataAvailable = useCallback(
    (event: BlobEvent) => {
      const chunk = event.data;
      if (chunk && chunk.size > 0) {
        void analyzeWebcamClip(chunk);
      }
    },
    [analyzeWebcamClip]
  );

  const handleStartCapture = useCallback(() => {
    const stream = (
      webcamRef.current as unknown as { stream?: MediaStream } | null
    )?.stream;
    if (!stream) {
      console.warn("Webcam stream not ready yet");
      return;
    }

    const supportedMimeType =
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : undefined;

    const options: MediaRecorderOptions = supportedMimeType
      ? { mimeType: supportedMimeType }
      : {};
    const recorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = recorder;
    recorder.addEventListener("dataavailable", handleDataAvailable);

    // Request a dataavailable event every 5 seconds
    recorder.start(5_000);
    setCapturing(true);
  }, [handleDataAvailable]);

  const handleStopCapture = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.removeEventListener("dataavailable", handleDataAvailable);
      recorder.stop();
    }
    setCapturing(false);
  }, [handleDataAvailable]);

  useEffect(() => {
    const camRef = webcamRef.current as unknown as {
      stream?: MediaStream;
    } | null;
    return () => {
      // Cleanup on unmount
      try {
        handleStopCapture();
      } catch (err) {
        console.warn("Error stopping capture on cleanup", err);
      }
      const stream = camRef?.stream;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [handleStopCapture]);

  return (
    <div className="relative w-50 h-50">
      <Webcam audio={false} ref={webcamRef} />
      <div className="mt-2 flex gap-2">
        {capturing ? (
          <button
            onClick={handleStopCapture}
            className="px-3 py-1 rounded bg-red-600 text-white"
          >
            Stop Capture
          </button>
        ) : (
          <button
            onClick={handleStartCapture}
            className="px-3 py-1 rounded bg-green-600 text-white"
          >
            Start Capture
          </button>
        )}
      </div>
    </div>
  );
}
