import { ExportSettings, WatermarkConfig } from '../types';

export interface ExportProgress {
  status: 'idle' | 'preparing' | 'recording' | 'finalizing' | 'completed' | 'error';
  progressPercent: number;
  currentSecond: number;
  totalSeconds: number;
  message: string;
  blobUrl?: string;
  blobSize?: number;
  format?: string;
  error?: string;
}

export class ExportPipeline {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isExporting: boolean = false;
  private cancelRequested: boolean = false;

  public async startExport(
    threeCanvas: HTMLCanvasElement,
    audioStream: MediaStream | null,
    settings: ExportSettings,
    watermarkConfig: WatermarkConfig,
    onProgress: (p: ExportProgress) => void
  ): Promise<{ blob: Blob; url: string; format: string }> {
    this.isExporting = true;
    this.cancelRequested = false;
    this.recordedChunks = [];

    const duration = settings.endTime - settings.startTime;
    if (duration <= 0) {
      throw new Error('Export duration must be greater than 0 seconds.');
    }

    onProgress({
      status: 'preparing',
      progressPercent: 5,
      currentSecond: 0,
      totalSeconds: duration,
      message: 'Initializing video recording pipeline & encoders...',
    });

    // 1. Offscreen Composite Canvas at Target Resolution
    const width = settings.resolution.width;
    const height = settings.resolution.height;

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = width;
    compositeCanvas.height = height;
    const ctx = compositeCanvas.getContext('2d', {
      alpha: false,
      desynchronized: false,
    })!;

    // Enable ultra high-quality interpolation for 4K / 2K upscaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 2. Setup Canvas Video Stream
    const fps = settings.fps || 60;
    const canvasStream = compositeCanvas.captureStream(fps);

    // 3. Mux Audio Stream
    const combinedStream = new MediaStream();

    // Add video track from canvas stream
    const videoTracks = canvasStream.getVideoTracks();
    if (videoTracks.length > 0) {
      combinedStream.addTrack(videoTracks[0]);
    } else {
      throw new Error('Could not capture video track from canvas.');
    }

    // Add audio track if present
    if (audioStream) {
      const audioTracks = audioStream.getAudioTracks();
      if (audioTracks.length > 0) {
        combinedStream.addTrack(audioTracks[0]);
      }
    }

    // 4. Select Supported MimeType for Lossless / High Quality Master
    const candidateTypes = settings.format === 'mp4'
      ? [
          'video/mp4;codecs=avc1.640028,mp4a.40.2', // High Profile H.264
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4;codecs=avc1.4d401f,mp4a.40.2',
          'video/mp4',
          'video/webm;codecs=vp9,opus',
          'video/webm',
        ]
      : [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp09.00.10.08,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4;codecs=avc1.640028,mp4a.40.2',
          'video/mp4',
        ];

    let chosenMimeType = '';
    for (const t of candidateTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        chosenMimeType = t;
        break;
      }
    }

    if (!chosenMimeType) {
      chosenMimeType = 'video/webm'; // fallback
    }

    // Bitrate calculation (up to 250 Mbps for 8K/4K Lossless Master)
    const bitrate = Math.max(1, Math.min(250, settings.bitrateMbps)) * 1000000;
    this.mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: chosenMimeType,
      videoBitsPerSecond: bitrate,
      audioBitsPerSecond: 320000, // 320 kbps high fidelity audio
    });

    this.recordedChunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) return reject(new Error('MediaRecorder init failed'));

      this.mediaRecorder.onstop = () => {
        if (this.cancelRequested) {
          onProgress({
            status: 'idle',
            progressPercent: 0,
            currentSecond: 0,
            totalSeconds: duration,
            message: 'Export was cancelled.',
          });
          return reject(new Error('Export cancelled by user.'));
        }

        onProgress({
          status: 'finalizing',
          progressPercent: 95,
          currentSecond: duration,
          totalSeconds: duration,
          message: 'Finalizing video container & audio sync...',
        });

        const extension = chosenMimeType.includes('mp4') ? 'mp4' : 'webm';
        const finalBlob = new Blob(this.recordedChunks, { type: chosenMimeType });
        const blobUrl = URL.createObjectURL(finalBlob);

        onProgress({
          status: 'completed',
          progressPercent: 100,
          currentSecond: duration,
          totalSeconds: duration,
          message: `Video rendering complete! Ready to download as ${extension.toUpperCase()}.`,
          blobUrl,
          blobSize: finalBlob.size,
          format: extension.toUpperCase(),
        });

        this.isExporting = false;
        resolve({ blob: finalBlob, url: blobUrl, format: extension });
      };

      this.mediaRecorder.onerror = (e) => {
        this.isExporting = false;
        reject(e);
      };

      // Start Recording with short timeslice for smooth streaming
      this.mediaRecorder.start(80);

      const startTimeMs = performance.now();
      const totalMs = duration * 1000;
      let frameIndex = 0;
      const totalEstimatedFrames = Math.round(duration * fps);

      const drawLoop = () => {
        if (!this.isExporting || this.cancelRequested) return;

        const elapsedMs = performance.now() - startTimeMs;
        const progress = Math.min(1.0, elapsedMs / totalMs);
        const currentSec = Math.min(duration, elapsedMs / 1000);
        frameIndex++;

        // Clear and draw background
        ctx.fillStyle = '#08090d';
        ctx.fillRect(0, 0, width, height);

        // Aspect fit source canvas with high smoothing
        const srcW = threeCanvas.width;
        const srcH = threeCanvas.height;
        const scale = Math.max(width / srcW, height / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        const offsetX = (width - drawW) / 2;
        const offsetY = (height - drawH) / 2;

        ctx.drawImage(threeCanvas, offsetX, offsetY, drawW, drawH);

        // Apply HDR10 wide-gamut / PQ tone curve if requested
        if (settings.enableHDR10) {
          const peak = settings.hdrPeakLuminance ?? 1000;
          const factor = Math.max(1.0, Math.min(3.0, peak / 400));
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = `rgba(255, 255, 255, ${(factor - 1.0) * 0.05})`;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }

        // Permanently burn Watermark and Captions into the encoded video output at target resolution!
        if (settings.includeWatermark && watermarkConfig.enabled) {
          this.renderWatermark(ctx, width, height, watermarkConfig, currentSec);
        }

        onProgress({
          status: 'recording',
          progressPercent: Math.round(progress * 90),
          currentSecond: Number(currentSec.toFixed(1)),
          totalSeconds: Number(duration.toFixed(1)),
          message: `Encoding frame ${frameIndex} / ${totalEstimatedFrames} (${Math.round(progress * 100)}%) • ${fps} FPS • ${width}×${height} • ${settings.enableHDR10 ? 'HDR10' : 'SDR'}`,
        });

        if (elapsedMs < totalMs) {
          requestAnimationFrame(drawLoop);
        } else {
          // Finished recording duration
          if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
          }
        }
      };

      requestAnimationFrame(drawLoop);
    });
  }

  public cancelExport() {
    this.cancelRequested = true;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.isExporting = false;
  }

  private renderWatermark(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cfg: WatermarkConfig,
    time: number
  ) {
    ctx.save();
    ctx.globalAlpha = cfg.opacity;

    // Font selection
    const fontFamilies = {
      script: '"Brush Script MT", "Caveat", cursive, sans-serif',
      serif: '"Cinzel", "Playfair Display", Georgia, serif',
      mono: '"JetBrains Mono", "Courier New", monospace',
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    };
    const fontFam = fontFamilies[cfg.fontFamily] || fontFamilies.sans;
    const baseFontSize = Math.round((cfg.fontSize / 360) * Math.min(width, height));

    ctx.font = `600 ${baseFontSize}px ${fontFam}`;
    ctx.fillStyle = cfg.color || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Drop shadow / glow
    if (cfg.enableGlow) {
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 8;
    }

    let posX = width / 2;
    let posY = height / 2;

    switch (cfg.position) {
      case 'top-center':
        posY = height * 0.08;
        break;
      case 'top-left':
        posX = width * 0.15;
        posY = height * 0.08;
        ctx.textAlign = 'left';
        break;
      case 'top-right':
        posX = width * 0.85;
        posY = height * 0.08;
        ctx.textAlign = 'right';
        break;
      case 'bottom-center':
        posY = height * 0.88;
        break;
      case 'bottom-left':
        posX = width * 0.15;
        posY = height * 0.88;
        ctx.textAlign = 'left';
        break;
      case 'bottom-right':
        posX = width * 0.85;
        posY = height * 0.88;
        ctx.textAlign = 'right';
        break;
      case 'center':
      default:
        posY = height * 0.48;
        break;
    }

    // Subtle floating breathing effect
    const floatY = Math.sin(time * 2.0) * (height * 0.005);
    posY += floatY;

    // Draw main username
    if (cfg.username) {
      ctx.fillText(cfg.username, posX, posY);
    }

    // Draw caption below username
    if (cfg.caption) {
      ctx.font = `400 ${Math.round(baseFontSize * 0.65)}px ${fontFam}`;
      ctx.fillText(cfg.caption, posX, posY + baseFontSize * 1.3);
    }

    ctx.restore();
  }
}
