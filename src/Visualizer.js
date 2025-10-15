import React, { useState, useEffect, useRef, Fragment } from "react";
import butterchurn from "butterchurn";
import butterchurnPresets from "butterchurn-presets";
import './Visualizer.css';
import AudioInput from "./AudioInput";

export default function Visualizer() {
  const canvasRef = useRef(null);
  const [audioContext] = useState(new (window.AudioContext || window.webkitAudioContext)());
  const [visualizer, setVisualizer] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [fullscreen, setFullscreen] = useState(false);
  const [presetNames, setPresetNames] = useState([]);
  const [currentPreset, setCurrentPreset] = useState("");
  const [presetIndex, setPresetIndex] = useState();
  const [randomPresetOn, setRandomPresetOn] = useState(false);


  const currentIndexRef = useRef(-1);
  const playlistRef = useRef([]);
  const sourceNodeRef = useRef(null);

  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  const shuffleOrderRef = useRef([]);
  const shuffleIndexRef = useRef(0);
  const [shuffle, setShuffle] = useState(false);




  // Initialize Butterchurn
  useEffect(() => {
    if (!canvasRef.current) return;

    const vis = butterchurn.createVisualizer(audioContext, canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight
    });
    setVisualizer(vis);

    const presets = butterchurnPresets.getPresets();
    const names = Object.keys(presets);
    setPresetNames(names);
    setCurrentPreset(names[0]);
    vis.loadPreset(presets[names[0]], 0);

    const render = () => {
      vis.render();
      requestAnimationFrame(render);
    };
    render();


    const handleResize = () => {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      vis.setRendererSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [audioContext]);

  useEffect(() => {
    const onFullScreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", onFullScreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullScreenChange);
  }, []);

  // ---------- Randomize Presets ----------
  const randomPreset = () => {
    if (!visualizer || presetNames.length === 0) return;
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * presetNames.length);
    } while (presetNames[randomIndex] === currentPreset && presetNames.length > 1);

    const nextPreset = presetNames[randomIndex];
    setCurrentPreset(nextPreset);
    visualizer.loadPreset(butterchurnPresets.getPresets()[nextPreset], 2.0);
  };

  useEffect(() => {
    if (!visualizer || presetNames.length === 0) return;

    if (randomPresetOn) {
      const interval = setInterval(() => {
        let randomIndex;
        const blacklist = ["Martin - mucus cervix", "Martin - fruit machine", "Milk Artist At our Best - FED - SlowFast Ft AdamFX n Martin - HD CosmoFX"];
        do {
          randomIndex = Math.floor(Math.random() * presetNames.length);
        } while ((presetNames[randomIndex] === currentPreset && presetNames.length > 1) || blacklist.includes(presetNames[randomIndex]));

        const nextPreset = presetNames[randomIndex];
        setCurrentPreset(nextPreset);
        setPresetIndex(randomIndex);
        visualizer.loadPreset(butterchurnPresets.getPresets()[nextPreset], 2.0);
      }, 25000); // change every 25 seconds

      return () => clearInterval(interval);
  }
  }, [randomPresetOn, currentPreset, presetNames, visualizer]);

  // ---------- Audio Functions ----------
  const playTrack = (index) => {

    const list = playlistRef.current;
    if (!visualizer || index < 0 || index >= list.length) return;


    const prev = list[currentIndexRef.current];
    if (prev) {
      prev.audio.onended = null;
      prev.audio.pause();
      prev.audio.currentTime = 0;
    }

    setCurrentIndex(index);
    currentIndexRef.current = index;

    const track = list[index];

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch {}
    }

    sourceNodeRef.current = track.node;
    visualizer.connectAudio(sourceNodeRef.current);
    try {
      sourceNodeRef.current.connect(audioContext.destination);
    } catch {
      console.error("Failed to connect audio source to destination");
    }

    audioContext.resume().then(() => {
      track.audio.currentTime = 0;
      track.audio.play();
      setPlaying(true);
    });

    const startedIndex = index;
    track.audio.onended = () => {
      const pl = playlistRef.current;
      if (pl.length > 1) {
        const next = (startedIndex + 1) % pl.length;
        playTrack(next);
      } else {
        setPlaying(false);
      }
    };
  };

  const togglePlay = () => {
    if (playlist.length === 0) return;

    if (currentIndex === -1) {
      playTrack(0);
      return;
    }
    const track = playlist[currentIndex];
    if (playing) {
      track.audio.pause();
      setPlaying(false);
    } else {
      track.audio.play();
      setPlaying(true);
    }
  };


  const skipNext = () => {
    const pl = playlistRef.current;
    if (pl.length === 0) return;

    if (shuffle) {
      shuffleIndexRef.current++;
      if (shuffleIndexRef.current >= shuffleOrderRef.current.length) {
        shuffleOrderRef.current = generateShuffleOrder(pl.length);
        shuffleIndexRef.current = 0;
      }
      const next = shuffleOrderRef.current[shuffleIndexRef.current];
      playTrack(next);
    } else {
      const next = (currentIndexRef.current + 1) % pl.length;
      playTrack(next);
    }
  };


  const skipPrev = () => {
    const pl = playlistRef.current;
    if (pl.length === 0) return;

    if (shuffle) {
      shuffleIndexRef.current--;
      if (shuffleIndexRef.current < 0) {
        shuffleOrderRef.current = generateShuffleOrder(pl.length);
        shuffleIndexRef.current = shuffleOrderRef.current.length - 1;
      }
      const prev = shuffleOrderRef.current[shuffleIndexRef.current];
      playTrack(prev);
    } else {
      const prev = (currentIndexRef.current - 1 + pl.length) % pl.length;
      playTrack(prev);
    }
  };

  const toggleShuffle = () => {
    if (!shuffle) {
      shuffleOrderRef.current = generateShuffleOrder(playlistRef.current.length);
      shuffleIndexRef.current = 0;
    }
    setShuffle(!shuffle);
  };


  function generateShuffleOrder(length) {
    const arr = [...Array(length).keys()];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------- Handlers ----------
  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    const newPlaylist = files.map(file => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.crossOrigin = "anonymous";
      audio.loop = false;
      const node = audioContext.createMediaElementSource(audio);
      return { name: file.name, audio, node };
    });

    setPlaylist(newPlaylist);
    playlistRef.current = newPlaylist;
    setCurrentIndex(-1);
    currentIndexRef.current = -1;

    if (newPlaylist.length > 0) playTrack(0);
  };

  const handlePresetChange = (e) => {
    const presetName = e.target.value;
    setCurrentPreset(presetName);
    visualizer.loadPreset(butterchurnPresets.getPresets()[presetName], 2.0);
  };

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      canvasRef.current.requestFullscreen().then(() => setFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setFullscreen(false));
    }
  };

  const copyPresetName = () => {
    if (!presetNames.length) return;
    const presetName = presetNames[presetIndex];
    console.log(presetIndex)
    if (!presetName) return;

    navigator.clipboard.writeText(presetName).then(() => {
      console.log(`Copied: ${presetName}`);
    }).catch(err => {
      console.error("Failed to copy preset name", err);
    });
};



  // ---------- JSX ----------
  return (
    <Fragment>
      <canvas ref={canvasRef} className="visualizer"/>

      {!fullscreen && (
        <div className="controls">
          <AudioInput visualizer={visualizer} audioContext={audioContext}/>
          <input type="file" multiple accept="audio/*" onChange={handleFileInput} />
          <br /><br />
          <label>Preset: </label>
          <select value={currentPreset} onChange={handlePresetChange}>
            {presetNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <div className="flex">
            <button onClick={() => setRandomPresetOn(prev => !prev)}>
              {randomPresetOn ? "Stop Random Presets 🔒" : "Random Presets 🎲"}
            </button>
            <button onClick={copyPresetName}>📋</button>
          </div>
          <br /><br />
          <div className="player-buttons">
            <button onClick={skipPrev}>⏮ Prev</button>
            <button onClick={togglePlay}>{playing ? "⏸ Pause" : "▶ Play"}</button>
            <button onClick={skipNext}>⏭ Next</button>
            <button onClick={toggleShuffle}>{shuffle ? "🔀 Shuffle On" : "🔀 Shuffle Off"}</button>
          </div>
          <br />
          <label>Track: </label>
          <select value={currentIndex} onChange={e => playTrack(parseInt(e.target.value))}>
            {playlist.map((track, idx) => <option key={idx} value={idx}>{track.name}</option>)}
          </select>
          <br /><br />
          <button onClick={handleFullscreenToggle}>Fullscreen</button>
        </div>
      )}
    </Fragment>
  );
}
