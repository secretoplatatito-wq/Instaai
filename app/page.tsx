'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Header } from '../src/ui/Header';
import { ViewportOverlay } from '../src/ui/ViewportOverlay';
import { BottomDock } from '../src/ui/BottomDock';
import { AudioUploaderModal } from '../src/ui/AudioUploaderModal';
import { ExportModal } from '../src/ui/ExportModal';
import { ProjectsModal } from '../src/ui/ProjectsModal';
import { AudioEngine } from '../src/audio/AudioEngine';
import { SceneEngine } from '../src/engine/SceneEngine';
import { Sandbox2DEngine } from '../src/sandbox/Sandbox2DEngine';
import { ExportPipeline, ExportProgress } from '../src/rendering/ExportPipeline';
import {
  ProjectData,
  BiomeType,
  BiomeConfig,
  AudioReactiveConfig,
  CameraConfig,
  WatermarkConfig,
  AspectRatio,
  AudioMetrics,
  StudioMode,
  Sandbox2DConfig,
} from '../src/types';
import { INITIAL_PROJECT, ProjectStore, DEFAULT_PRESETS, DEFAULT_SANDBOX_CONFIG } from '../src/editor/ProjectStore';
import { McpApiModal } from '../src/ui/McpApiModal';

export default function BiomeBeatStudio() {
  // Project & Configuration State (deterministic SSR + post-hydration sync to prevent hydration mismatch)
  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([INITIAL_PROJECT]);
  const [project, setProject] = useState<ProjectData>(INITIAL_PROJECT);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [metrics, setMetrics] = useState<AudioMetrics>({
    bass: 0,
    subBass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    treble: 0,
    energy: 0,
    rms: 0,
    beat: false,
    beatStrength: 0,
    bpm: 110,
    spectralFlux: 0,
  });
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isMcpOpen, setIsMcpOpen] = useState(false);

  // Export Progress State
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    status: 'idle',
    progressPercent: 0,
    currentSecond: 0,
    totalSeconds: 15,
    message: '',
  });

  // Engine References
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneEngineRef = useRef<SceneEngine | null>(null);

  const sandboxMountRef = useRef<HTMLDivElement>(null);
  const sandboxCanvasRef = useRef<HTMLCanvasElement>(null);
  const sandboxEngineRef = useRef<Sandbox2DEngine | null>(null);

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const exportPipelineRef = useRef<ExportPipeline | null>(null);

  // Sync state refs to avoid stale closures in requestAnimationFrame loops
  const projectRef = useRef<ProjectData>(project);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Hydration sync: safely restore saved projects from localStorage after initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = ProjectStore.getSavedProjects();
      if (saved && saved.length > 0) {
        setSavedProjects(saved);
        const active = saved[0];
        setProject(active);
        if (sceneEngineRef.current) {
          sceneEngineRef.current.setAspectRatio(active.exportSettings.aspectRatio);
          sceneEngineRef.current.setCameraConfig(active.cameraConfig);
          sceneEngineRef.current.setBiome(active.biomeType, active.biomeConfig);
        }
        if (sandboxEngineRef.current) {
          sandboxEngineRef.current.setAspectRatio(active.exportSettings.aspectRatio);
          sandboxEngineRef.current.resetSimulation(active.sandboxConfig);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Initialize Engines on mount
  useEffect(() => {
    const audioEngine = new AudioEngine();
    audioEngineRef.current = audioEngine;
    exportPipelineRef.current = new ExportPipeline();

    const initial = projectRef.current;

    // 1. Initialize 3D Three.js Engine
    if (canvasMountRef.current && canvasRef.current) {
      const sceneEngine = new SceneEngine(canvasMountRef.current, canvasRef.current);
      sceneEngineRef.current = sceneEngine;

      sceneEngine.setAspectRatio(initial.exportSettings.aspectRatio);
      sceneEngine.setCameraConfig(initial.cameraConfig);
      sceneEngine.setBiome(initial.biomeType, initial.biomeConfig);

      // Start 3D animation loop
      sceneEngine.startAnimation(
        () => audioEngine.getMetrics(projectRef.current.audioReactiveConfig.sensitivity, projectRef.current.audioReactiveConfig.smoothing),
        () => projectRef.current.biomeConfig,
        () => projectRef.current.audioReactiveConfig,
        () => {
          // Sync current audio playback time & metrics
          setCurrentTime(audioEngine.getCurrentTime());
          setMetrics(audioEngine.getMetrics(projectRef.current.audioReactiveConfig.sensitivity, projectRef.current.audioReactiveConfig.smoothing));
        }
      );
    }

    // 2. Initialize 2D Sandbox Simulation Engine
    if (sandboxMountRef.current && sandboxCanvasRef.current) {
      const sandboxEngine = new Sandbox2DEngine(sandboxMountRef.current, sandboxCanvasRef.current);
      sandboxEngineRef.current = sandboxEngine;
      sandboxEngine.setAspectRatio(initial.exportSettings.aspectRatio);
      sandboxEngine.resetSimulation(initial.sandboxConfig);

      // Dedicated 2D Sandbox animation loop
      let animId: number;
      let lastTime = performance.now();

      const loop2D = (time: number) => {
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        if (projectRef.current.studioMode === '2d-sandbox') {
          const currentMetrics = audioEngine.getMetrics(
            projectRef.current.audioReactiveConfig.sensitivity,
            projectRef.current.audioReactiveConfig.smoothing
          );
          sandboxEngine.render(
            currentMetrics,
            projectRef.current.sandboxConfig,
            projectRef.current.watermarkConfig,
            dt
          );
          setCurrentTime(audioEngine.getCurrentTime());
          setMetrics(currentMetrics);
        }

        animId = requestAnimationFrame(loop2D);
      };

      animId = requestAnimationFrame(loop2D);

      // Store cleanup for 2D loop
      (window as unknown as { _cleanup2D?: () => void })._cleanup2D = () => {
        cancelAnimationFrame(animId);
        sandboxEngine.dispose();
      };
    }

    // Load default sample track into audio engine
    audioEngine.loadBuiltinTrack('gravity-chimes').then((trackInfo) => {
      setProject((prev) => ({
        ...prev,
        trackInfo,
        exportSettings: {
          ...prev.exportSettings,
          endTime: Math.min(15, trackInfo.duration),
        },
      }));
      setWaveformPeaks(audioEngine.getWaveformData(80));
    });

    // Resize listener
    const handleResize = () => {
      sceneEngineRef.current?.resize();
      sandboxEngineRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      sceneEngineRef.current?.dispose();
      audioEngineRef.current?.stop();
      if ((window as unknown as { _cleanup2D?: () => void })._cleanup2D) {
        (window as unknown as { _cleanup2D?: () => void })._cleanup2D!();
      }
    };
  }, []);

  // Studio Mode Switcher
  const handleSetStudioMode = useCallback((mode: StudioMode) => {
    setProject((prev) => {
      const updated = { ...prev, studioMode: mode };
      ProjectStore.saveProject(updated);
      return updated;
    });
    setTimeout(() => {
      if (mode === '3d-biome') {
        sceneEngineRef.current?.resize();
      } else {
        sandboxEngineRef.current?.resize();
      }
    }, 50);
  }, []);

  // 2D Sandbox Config Handlers
  const handleChangeSandboxConfig = useCallback((cfg: Partial<Sandbox2DConfig>) => {
    setProject((prev) => {
      const updated = {
        ...prev,
        sandboxConfig: { ...prev.sandboxConfig, ...cfg },
      };
      ProjectStore.saveProject(updated);
      return updated;
    });
  }, []);

  const handleResetSandbox = useCallback(() => {
    sandboxEngineRef.current?.resetSimulation(projectRef.current.sandboxConfig);
  }, []);

  // Update Biome on Type/Config change
  const handleSelectBiome = useCallback((type: BiomeType) => {
    setProject((prev) => {
      const updated = { ...prev, biomeType: type };
      sceneEngineRef.current?.setBiome(type, updated.biomeConfig);
      ProjectStore.saveProject(updated);
      return updated;
    });
  }, []);

  const handleChangeBiomeConfig = useCallback((cfg: Partial<BiomeConfig>) => {
    setProject((prev) => {
      const updated = {
        ...prev,
        biomeConfig: { ...prev.biomeConfig, ...cfg },
      };
      ProjectStore.saveProject(updated);
      return updated;
    });
  }, []);

  const handleChangeReactiveConfig = useCallback((cfg: Partial<AudioReactiveConfig>) => {
    setProject((prev) => {
      const updated = {
        ...prev,
        audioReactiveConfig: { ...prev.audioReactiveConfig, ...cfg },
      };
      ProjectStore.saveProject(updated);
      return updated;
    });
  }, []);

  const handleChangeCameraConfig = useCallback((cfg: Partial<CameraConfig>) => {
    setProject((prev) => {
      const updated = {
        ...prev,
        cameraConfig: { ...prev.cameraConfig, ...cfg },
      };
      sceneEngineRef.current?.setCameraConfig(updated.cameraConfig);
      ProjectStore.saveProject(updated);
      return updated;
    });
  }, []);

  const handleChangeWatermarkConfig = useCallback((cfg: Partial<WatermarkConfig>) => {
    setProject((prev) => {
      const updated = {
        ...prev,
        watermarkConfig: { ...prev.watermarkConfig, ...cfg },
      };
      ProjectStore.saveProject(updated);
      return updated;
    });
  }, []);

  const handleSetAspectRatio = useCallback((aspect: AspectRatio) => {
    setProject((prev) => {
      const updated = {
        ...prev,
        exportSettings: { ...prev.exportSettings, aspectRatio: aspect },
      };
      sceneEngineRef.current?.setAspectRatio(aspect);
      sandboxEngineRef.current?.setAspectRatio(aspect);
      ProjectStore.saveProject(updated);
      return updated;
    });
  }, []);

  const handleRandomizeSeed = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 999999);
    handleChangeBiomeConfig({ seed: newSeed });
    sceneEngineRef.current?.setBiome(projectRef.current.biomeType, {
      ...projectRef.current.biomeConfig,
      seed: newSeed,
    });
  }, [handleChangeBiomeConfig]);

  // Audio Playback Controls
  const handleTogglePlay = useCallback(() => {
    if (!audioEngineRef.current) return;
    if (isPlaying) {
      audioEngineRef.current.pause();
      setIsPlaying(false);
    } else {
      audioEngineRef.current.play(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleRestart = useCallback(() => {
    if (!audioEngineRef.current) return;
    audioEngineRef.current.seek(0);
    audioEngineRef.current.play(() => {
      setIsPlaying(false);
    });
    setIsPlaying(true);
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (!audioEngineRef.current) return;
    audioEngineRef.current.seek(time);
    setCurrentTime(time);
  }, []);

  const handleSetVolume = useCallback((vol: number) => {
    setVolume(vol);
    audioEngineRef.current?.setVolume(vol);
  }, []);

  // Upload Handlers
  const handleUploadFile = useCallback(async (file: File) => {
    if (!audioEngineRef.current) return;
    const trackInfo = await audioEngineRef.current.loadAudioFile(file);
    setProject((prev) => {
      const updated = {
        ...prev,
        trackInfo,
        exportSettings: {
          ...prev.exportSettings,
          startTime: 0,
          endTime: Math.min(30, trackInfo.duration),
        },
      };
      ProjectStore.saveProject(updated);
      return updated;
    });
    setWaveformPeaks(audioEngineRef.current.getWaveformData(80));
    setIsPlaying(false);
    audioEngineRef.current.play(() => setIsPlaying(false));
    setIsPlaying(true);
  }, []);

  const handleSelectBuiltinTrack = useCallback(async (trackId: 'gravity-chimes' | 'neon-velocity' | 'kinetic-trap') => {
    if (!audioEngineRef.current) return;
    const trackInfo = await audioEngineRef.current.loadBuiltinTrack(trackId);
    setProject((prev) => {
      const updated = {
        ...prev,
        trackInfo,
        exportSettings: {
          ...prev.exportSettings,
          startTime: 0,
          endTime: Math.min(20, trackInfo.duration),
        },
      };
      ProjectStore.saveProject(updated);
      return updated;
    });
    setWaveformPeaks(audioEngineRef.current.getWaveformData(80));
    setIsPlaying(false);
    audioEngineRef.current.play(() => setIsPlaying(false));
    setIsPlaying(true);
  }, []);

  // Load Preset
  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = DEFAULT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setProject((prev) => {
      const updated: ProjectData = {
        ...prev,
        name: preset.name,
        studioMode: preset.data.studioMode || prev.studioMode,
        biomeType: preset.data.biomeType || prev.biomeType,
        biomeConfig: preset.data.biomeConfig || prev.biomeConfig,
        sandboxConfig: preset.data.sandboxConfig || prev.sandboxConfig,
        cameraConfig: preset.data.cameraConfig || prev.cameraConfig,
        watermarkConfig: preset.data.watermarkConfig || prev.watermarkConfig,
      };
      sceneEngineRef.current?.setBiome(updated.biomeType, updated.biomeConfig);
      sceneEngineRef.current?.setCameraConfig(updated.cameraConfig);
      sandboxEngineRef.current?.resetSimulation(updated.sandboxConfig);
      ProjectStore.saveProject(updated);
      return updated;
    });
  }, []);

  // Snapshot Capture
  const handleCaptureSnapshot = useCallback(() => {
    const canvas =
      project.studioMode === '2d-sandbox'
        ? sandboxEngineRef.current?.getCanvas()
        : sceneEngineRef.current?.getCanvas();
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `biome-beat-snapshot-${Date.now()}.png`;
    a.click();
  }, [project.studioMode]);

  // Video Export Handler
  const handleStartExport = useCallback(async () => {
    if (!audioEngineRef.current || !exportPipelineRef.current) return;

    const canvas =
      project.studioMode === '2d-sandbox'
        ? sandboxEngineRef.current?.getCanvas()
        : sceneEngineRef.current?.getCanvas();

    if (!canvas) return;

    const audioStream = audioEngineRef.current.getAudioStream();

    // Seek to export start time and play
    audioEngineRef.current.seek(project.exportSettings.startTime);
    audioEngineRef.current.play();
    setIsPlaying(true);

    try {
      await exportPipelineRef.current.startExport(
        canvas,
        audioStream,
        project.exportSettings,
        project.watermarkConfig,
        (prog) => setExportProgress(prog)
      );
    } catch {
      // Handled in pipeline
    } finally {
      audioEngineRef.current.pause();
      setIsPlaying(false);
    }
  }, [project.studioMode, project.exportSettings, project.watermarkConfig]);

  const handleCancelExport = useCallback(() => {
    exportPipelineRef.current?.cancelExport();
    audioEngineRef.current?.pause();
    setIsPlaying(false);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#08090d]">
      {/* 1. Header Bar */}
      <Header
        studioMode={project.studioMode}
        onSetStudioMode={handleSetStudioMode}
        activeBiomeType={project.biomeType}
        sandboxType={project.sandboxConfig?.type ?? 'ellipse-laser'}
        aspectRatio={project.exportSettings.aspectRatio}
        onSetAspectRatio={handleSetAspectRatio}
        trackInfo={project.trackInfo}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenProjects={() => setIsProjectsOpen(true)}
        onOpenMcp={() => setIsMcpOpen(true)}
        onLoadPreset={handleLoadPreset}
        onRandomizeSeed={handleRandomizeSeed}
      />

      {/* 2A. Isolated WebGL 3D Canvas Mount */}
      <div
        ref={canvasMountRef}
        className={`absolute inset-0 flex items-center justify-center pointer-events-auto transition-opacity duration-300 ${
          project.studioMode === '3d-biome' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
        }`}
      >
        <canvas ref={canvasRef} className="block shadow-2xl transition-all duration-300" />
      </div>

      {/* 2B. Isolated 2D Viral Sandbox Canvas Mount */}
      <div
        ref={sandboxMountRef}
        className={`absolute inset-0 flex items-center justify-center pointer-events-auto transition-opacity duration-300 ${
          project.studioMode === '2d-sandbox' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
        }`}
      >
        <canvas ref={sandboxCanvasRef} className="block shadow-2xl transition-all duration-300" />
      </div>

      {/* 3. Interactive Viewport HUD Overlay (Watermark, Waveform scrubber, Playback) */}
      <ViewportOverlay
        studioMode={project.studioMode}
        watermarkConfig={project.watermarkConfig}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={project.trackInfo?.duration || 30}
        metrics={metrics}
        trackInfo={project.trackInfo}
        waveformPeaks={waveformPeaks}
        onTogglePlay={handleTogglePlay}
        onRestart={handleRestart}
        onSeek={handleSeek}
        volume={volume}
        onSetVolume={handleSetVolume}
        onCaptureSnapshot={handleCaptureSnapshot}
      />

      {/* 4. Collapsible Bottom Control Dock (Complies with Three.js Skill layout) */}
      <BottomDock
        studioMode={project.studioMode}
        onSetStudioMode={handleSetStudioMode}
        biomeType={project.biomeType}
        onSelectBiome={handleSelectBiome}
        biomeConfig={project.biomeConfig}
        onChangeBiomeConfig={handleChangeBiomeConfig}
        sandboxConfig={project.sandboxConfig || DEFAULT_SANDBOX_CONFIG}
        onChangeSandboxConfig={handleChangeSandboxConfig}
        onResetSandbox={handleResetSandbox}
        reactiveConfig={project.audioReactiveConfig}
        onChangeReactiveConfig={handleChangeReactiveConfig}
        cameraConfig={project.cameraConfig}
        onChangeCameraConfig={handleChangeCameraConfig}
        watermarkConfig={project.watermarkConfig}
        onChangeWatermarkConfig={handleChangeWatermarkConfig}
        onOpenExport={() => setIsExportOpen(true)}
        onRandomizeSeed={handleRandomizeSeed}
      />

      {/* 5. Modals */}
      <AudioUploaderModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        currentTrack={project.trackInfo}
        onUploadFile={handleUploadFile}
        onSelectBuiltin={handleSelectBuiltinTrack}
        startTime={project.exportSettings.startTime}
        endTime={project.exportSettings.endTime}
        onChangeTrim={(start, end) => {
          setProject((prev) => ({
            ...prev,
            exportSettings: {
              ...prev.exportSettings,
              startTime: start,
              endTime: end,
            },
          }));
        }}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        settings={project.exportSettings}
        onChangeSettings={(s) => {
          setProject((prev) => ({
            ...prev,
            exportSettings: { ...prev.exportSettings, ...s },
          }));
        }}
        onStartExport={handleStartExport}
        onCancelExport={handleCancelExport}
        progress={exportProgress}
      />

      <ProjectsModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        currentProjectId={project.id}
        onLoadProject={(p) => {
          setProject(p);
          sceneEngineRef.current?.setBiome(p.biomeType, p.biomeConfig);
          sceneEngineRef.current?.setCameraConfig(p.cameraConfig);
          sceneEngineRef.current?.setAspectRatio(p.exportSettings.aspectRatio);
          sandboxEngineRef.current?.setAspectRatio(p.exportSettings.aspectRatio);
          if (p.sandboxConfig) {
            sandboxEngineRef.current?.resetSimulation(p.sandboxConfig);
          }
        }}
        onCreateNew={() => {
          const fresh: ProjectData = {
            ...INITIAL_PROJECT,
            id: `project-${Date.now()}`,
            name: `New Visualizer Reel ${savedProjects.length + 1}`,
          };
          setProject(fresh);
          sceneEngineRef.current?.setBiome(fresh.biomeType, fresh.biomeConfig);
          sandboxEngineRef.current?.resetSimulation(fresh.sandboxConfig);
          ProjectStore.saveProject(fresh);
          setSavedProjects(ProjectStore.getSavedProjects());
        }}
        savedProjects={savedProjects}
        onRefreshProjects={() => setSavedProjects(ProjectStore.getSavedProjects())}
      />

      <McpApiModal isOpen={isMcpOpen} onClose={() => setIsMcpOpen(false)} />
    </main>
  );
}
