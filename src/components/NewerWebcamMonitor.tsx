import { useReactMediaRecorder } from "react-media-recorder";
import { useRef, useEffect } from "react";
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
    // mediaBlobUrl,
    previewStream,
    clearBlobUrl,
  } = useReactMediaRecorder({
    video: true,
    audio: false,
    onStop: (blobUrl: string, blob: Blob) => {
      void (async () => {
        console.log("Blob:", blob);
        console.log("Generating upload URL");
        const postUrl = await generateUploadUrl();

        console.log("Uploading blob to Convex");
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });

        const { storageId } = await result.json();
        console.log("Storage ID:", storageId);

        console.log("Firing off convex action");
        await processChunk({ videoStorageId: storageId });

        console.log("Done sending video to server");
        clearBlobUrl();
      })();
    },
  });
  // const [isActive, setIsActive] = useState<boolean>(false);
  // const [count, setCount] = useState<number>(0);
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
        // setCount((prevCount) => prevCount + 1);
        console.log("Stopping recording");
        stopRecording();
        console.log(status);
        clearBlobUrl();
        startRecording();
      })();
    }, 10000);

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
      {/* <p>Count: {count}</p> */}
      {/* <button onClick={startWebcamMonitoring}>Start webcam monitoring</button>
      <button onClick={stopWebcamMonitoring}>Stop webcam monitoring</button> */}
      <VideoPreview stream={previewStream} />
      {/* <video src={mediaBlobUrl} controls autoPlay loop /> */}
    </div>
  );
}
