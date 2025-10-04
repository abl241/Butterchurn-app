import React, { useState, useEffect, useRef } from "react";

function AudioInput({ visualizer, audioContext }) {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const sourceRef = useRef(null);
  const streamRef = useRef(null);

  // Get list of audio input devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(deviceInfos => {
      const inputs = deviceInfos.filter(d => d.kind === "audioinput");
      setDevices(inputs);
    });
  }, []);

  const resumeAudio = async () => {
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  };

  const handleDeviceChange = async (event) => {
    const deviceId = event.target.value;
    setSelectedDeviceId(deviceId);

    await resumeAudio();

    // stop old stream if it exists
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // disconnect old source if it exists
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // get new stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: deviceId ? { exact: deviceId } : undefined }
    });
    streamRef.current = stream;

    // create new MediaStreamSource on the existing audioContext
    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    // connect to visualizer
    visualizer.connectAudio(source);
  };

  return (
    <div className="audio-input-selector">
      <label htmlFor="audioSource">Choose Audio Input: </label>
      <select id="audioSource" value={selectedDeviceId} onChange={handleDeviceChange}>
        <option value="">Select...</option>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `Input ${d.deviceId}`}
          </option>
        ))}
      </select>
    </div>
  );
}

export default AudioInput;
