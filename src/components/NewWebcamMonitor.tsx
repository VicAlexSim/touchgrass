import { useRecordWebcam } from "react-record-webcam";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export function NewWebcamMonitor() {
  const { createRecording, openCamera, startRecording, stopRecording } =
    useRecordWebcam();
  const processChunk = useAction(api.webcam.processChunk);
  const generateUploadUrl = useMutation(api.webcam.generateUploadUrl);

  const recordVideo = async () => {
    const recording = await createRecording();
    console.log("Recording created");
    if (!recording) return;
    await openCamera(recording.id);
    await startRecording(recording.id);
    console.log("Recording started");
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Record for 3 seconds
    console.log("Done waiting for 3 seconds");

    const recorded = await stopRecording(recording.id);
    console.log("Recording stopped");

    if (!recording.blob) return;

    // Step 1: Get a short-lived upload URL
    const postUrl = await generateUploadUrl();
    // Step 2: POST the file to the URL
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": recording.blob.type },
      body: recording.blob,
    });
    const { storageId } = await result.json();
    void processChunk({ videoStorageId: storageId });
    console.log("Done sending video to server");
  };

  return (
    <button
      onClick={() => {
        void recordVideo();
      }}
    >
      Record Video
    </button>
  );
}
