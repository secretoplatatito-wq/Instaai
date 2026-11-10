'use client';

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Music,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  FileAudio,
} from 'lucide-react';
import { AudioTrackInfo } from '../types';

interface AudioUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: AudioTrackInfo | null;
  onUploadFile: (file: File) => Promise<void>;
  onSelectBuiltin: (trackId: 'gravity-chimes' | 'neon-velocity' | 'kinetic-trap') => Promise<void>;
  startTime: number;
  endTime: number;
  onChangeTrim: (start: number, end: number) => void;
}

export const AudioUploaderModal: React.FC<AudioUploaderModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  onUploadFile,
  onSelectBuiltin,
  startTime,
  endTime,
  onChangeTrim,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setLoading(true);
      try {
        await onUploadFile(file);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setLoading(true);
      try {
        await onUploadFile(file);
      } finally {
        setLoading(false);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const maxDuration = currentTrack ? currentTrack.duration : 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-xl bg-[#10141d] border border-white/10 rounded-2xl shadow-2xl p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Audio & Soundtrack Studio</h2>
              <p className="text-xs text-gray-400">Upload your track or select a viral procedural beat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/20'
                : 'border-white/15 bg-white/5 hover:bg-white/10'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 mb-2">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">
              {loading ? 'Decoding Audio Spectrum...' : 'Drop audio file here, or click to browse'}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Supports MP3, WAV, OGG, M4A, AAC, FLAC (100% processed locally in browser)
            </p>
          </div>

          {/* Built-in Viral Sample Tracks */}
          <div>
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Or Select Procedural Viral Track:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'gravity-chimes',
                  name: 'Gravity Chimes',
                  bpm: 110,
                  desc: 'Satisfying bell chimes (Viral Reference)',
                },
                {
                  id: 'neon-velocity',
                  name: 'Neon Velocity',
                  bpm: 128,
                  desc: 'Cyberpunk synthwave & driving kicks',
                },
                {
                  id: 'kinetic-trap',
                  name: 'Kinetic Trap',
                  bpm: 140,
                  desc: 'Heavy 808 sub bass & rolling trap hats',
                },
              ].map((t) => {
                const isSelected = currentTrack?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await onSelectBuiltin(t.id as 'gravity-chimes' | 'neon-velocity' | 'kinetic-trap');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                      isSelected
                        ? 'border-orange-500 bg-orange-950/30 text-white ring-1 ring-orange-500/50'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold truncate">{t.name}</span>
                      <span className="text-[10px] font-mono text-orange-400 bg-orange-500/20 px-1 py-0.5 rounded">
                        {t.bpm} BPM
                      </span>
                    </div>
                    <span className="block text-[10px] text-gray-400 line-clamp-1">{t.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Track Metadata & Trim Controls */}
          {currentTrack && (
            <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-white truncate max-w-[240px]">
                    {currentTrack.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-gray-400 text-[11px] font-mono">
                  <span>{formatTime(currentTrack.duration)}</span>
                  <span>{currentTrack.sampleRate} Hz</span>
                  <span>{currentTrack.channels}ch</span>
                </div>
              </div>

              {/* Trim Range Slider for Video Export */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-orange-400" />
                    <span>Reel Export Range:</span>
                  </span>
                  <span className="font-mono text-cyan-400">
                    {formatTime(startTime)} → {formatTime(endTime)} ({Math.round(endTime - startTime)}s duration)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">Start Time (sec)</label>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(1, maxDuration - 5)}
                      step="1"
                      value={startTime}
                      onChange={(e) => {
                        const newStart = parseFloat(e.target.value);
                        onChangeTrim(newStart, Math.max(newStart + 5, endTime));
                      }}
                      className="w-full h-1 bg-white/10 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">End Time (sec)</label>
                    <input
                      type="range"
                      min={startTime + 3}
                      max={maxDuration}
                      step="1"
                      value={endTime}
                      onChange={(e) => onChangeTrim(startTime, parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition cursor-pointer"
          >
            Apply Soundtrack
          </button>
        </div>
      </div>
    </div>
  );
};
