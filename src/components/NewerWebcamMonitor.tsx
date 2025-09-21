import { useReactMediaRecorder } from "react-media-recorder";
import { useRef, useEffect, useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

const VideoPreview = ({ stream }: { stream: MediaStream | null }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  if (!stream) {
    return null;
  }
  return <video ref={videoRef} width={500} height={500} autoPlay controls />;
};

export function NewerWebcamMonitor() {
  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    previewStream,
    clearBlobUrl,
  } = useReactMediaRecorder({ video: true, audio: false });
  // const [isActive, setIsActive] = useState<boolean>(false);
  const [count, setCount] = useState<number>(0);
  const processChunk = useAction(api.webcam.processChunk);
  const generateUploadUrl = useMutation(api.webcam.generateUploadUrl);

  useEffect(() => {
    // Start recording when component mounts
    startRecording();
  }, [startRecording]);

  useEffect(() => {
    // Set up the interval
    const intervalId = setInterval(() => {
      void (async () => {
        setCount((prevCount) => prevCount + 1);
        console.log("Stopping recording");
        stopRecording();
        console.log(status);

        if (!mediaBlobUrl) {
          console.log("No media blob url found");
          clearBlobUrl();
          startRecording();
          return;
        }

        // Get the actual blob from the blob URL
        console.log("Getting actual blob from URL");
        const blobResponse = await fetch(mediaBlobUrl);
        const blob = await blobResponse.blob();
        console.log("Blob:", blob);

        console.log("Generating upload URL");
        // Step 1: Get a short-lived upload URL
        const postUrl = await generateUploadUrl();

        console.log("Uploading blob to Convex");
        // Step 2: POST the file to the URL
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });
        const { storageId } = await result.json();

        console.log("Firing off convex action");
        void processChunk({ videoStorageId: storageId });

        console.log("Done sending video to server");

        clearBlobUrl();
        startRecording();
      })();
    }, 5000);

    // Clean up the interval when the component unmounts or dependencies change
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array ensures the effect runs only once on mount

  // const startWebcamMonitoring = () => {
  //   setIsActive(true);
  //   startRecording();
  // };

  // const stopWebcamMonitoring = () => {
  //   setIsActive(false);
  //   stopRecording();
  // };

  return (
    <div>
      <p>Count: {count}</p>
      {/* <button onClick={startWebcamMonitoring}>Start webcam monitoring</button>
      <button onClick={stopWebcamMonitoring}>Stop webcam monitoring</button> */}
      <VideoPreview stream={previewStream} />
      <video src={mediaBlobUrl} controls autoPlay loop />
    </div>
  );
}
