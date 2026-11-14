"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  Loader2,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  MessageSquare,
  Mic,
  CheckCircle2,
} from "lucide-react";

export function RichMediaSelector({
  config,
  setConfig,
}: {
  config: Record<string, any>;
  setConfig: (next: Record<string, any>) => void;
}) {
  const currentFormat = config.mediaType || "TEXT";
  const mediaUrl = config.mediaUrl || "";
  const mediaFileName = config.mediaFileName || "";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showDirectUrlInput, setShowDirectUrlInput] = useState(false);

  const getFormatDetails = () => {
    switch (currentFormat) {
      case "AUDIO":
        return {
          title: "Instagram Native Voice Note (.mp3 / .wav)",
          accept: "audio/*,.mp3,.wav,.m4a,.aac,.ogg",
          folder: "media",
          hint: "MP3, WAV, or M4A (Max 50MB)",
          uploadLabel: "Upload Voice Memo",
          badge: "High Trust",
          description:
            "Delivers a native playable audio waveform inside their DM. Prospects perceive it as an authentic personal voice note from you, driving 300% higher trust!",
        };
      case "FILE":
        return {
          title: "Document & Lead Magnet Delivery (.pdf / .doc)",
          accept: ".pdf,.doc,.docx,application/pdf",
          folder: "documents",
          hint: "PDF or DOC documents (Max 50MB)",
          uploadLabel: "Upload Document / PDF",
          badge: "Instant Download",
          description:
            "Delivers a clean PDF asset card directly in their chat for instant 1-tap download.",
        };
      case "IMAGE":
        return {
          title: "Visual Image Delivery (.png / .jpg / .webp)",
          accept: "image/*,.png,.jpg,.jpeg,.webp,.gif",
          folder: "media",
          hint: "PNG, JPG, or WEBP (Max 50MB)",
          uploadLabel: "Upload Image",
          badge: "High Engagement",
          description:
            "Delivers a vibrant visual product flyer or thumbnail directly in chat.",
        };
      default:
        return null;
    }
  };

  const formatDetails = getFormatDetails();

  const handleFileUpload = async (file: File) => {
    if (!file || !formatDetails) return;
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File size exceeds 50MB limit");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", formatDetails.folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Upload failed");
      }

      const data = await res.json();
      if (data?.url) {
        setConfig({
          ...config,
          mediaUrl: data.url,
          mediaType: currentFormat,
          mediaFileName: file.name,
        });
        setShowDirectUrlInput(false);
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleClearMedia = () => {
    setConfig({
      ...config,
      mediaUrl: "",
      mediaFileName: "",
    });
    setUploadError(null);
  };

  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Message Format &amp; Rich Media
        </label>
        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
          High Converting
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
        {[
          { id: "TEXT", label: "Text", icon: MessageSquare },
          { id: "AUDIO", label: "Voice", icon: Mic },
          { id: "FILE", label: "PDF", icon: FileText },
          { id: "IMAGE", label: "Image", icon: ImageIcon },
        ].map((fmt) => {
          const IconComponent = fmt.icon;
          return (
            <button
              key={fmt.id}
              type="button"
              onClick={() => {
                setConfig({
                  ...config,
                  mediaType: fmt.id,
                  ...(fmt.id === "TEXT" ? { mediaUrl: "", mediaFileName: "" } : {}),
                });
                setUploadError(null);
              }}
              className={`py-1.5 px-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${currentFormat === fmt.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
                }`}
            >
              <IconComponent className="w-3.5 h-3.5 shrink-0" />
              <span>{fmt.label}</span>
            </button>
          );
        })}
      </div>

      {currentFormat !== "TEXT" && formatDetails && (
        <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
          {/* Header & Description */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              {formatDetails.title}
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
              {formatDetails.badge}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            {formatDetails.description}
          </p>

          {/* Hidden File Input for Desktop & Mobile File Pickers */}
          <input
            type="file"
            ref={fileInputRef}
            accept={formatDetails.accept}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              <span>{uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-red-500 hover:text-red-800 font-bold ml-2 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Uploading Progress Indicator */}
          {isUploading && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 flex items-center justify-center gap-2.5 text-xs text-blue-700 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Uploading to storage...</span>
            </div>
          )}

          {/* Case 1: Media is uploaded or URL provided -> Show Live Preview Card */}
          {mediaUrl && !isUploading ? (
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Attached Asset</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleClearMedia}
                    className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Format-specific live preview component */}
              {currentFormat === "AUDIO" && (
                <div className="space-y-1.5 p-2 bg-purple-50/70 border border-purple-200 rounded-lg">
                  <audio controls src={mediaUrl} className="w-full h-8" />
                  <p className="text-[10px] text-purple-700 font-mono truncate">
                    {mediaFileName || mediaUrl.split("/").pop()}
                  </p>
                </div>
              )}

              {currentFormat === "FILE" && (
                <div className="flex items-center gap-3 p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs">
                  <FileText className="w-6 h-6 text-blue-600 shrink-0" />
                  <div className="flex-1 overflow-hidden">
                    <span className="font-semibold text-slate-800 truncate block">
                      {mediaFileName || mediaUrl.split("/").pop() || "Document File"}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      Ready for instant 1-tap download
                    </span>
                  </div>
                  <a
                    href={mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-500 hover:text-blue-600 cursor-pointer"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {currentFormat === "IMAGE" && (
                <div className="space-y-1.5">
                  <img
                    src={mediaUrl}
                    alt="Preview"
                    className="w-full max-h-40 object-cover rounded-lg border border-slate-200"
                  />
                  <p className="text-[10px] text-slate-500 font-mono truncate">
                    {mediaFileName || mediaUrl.split("/").pop()}
                  </p>
                </div>
              )}

              {/* Expandable URL editor if needed */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowDirectUrlInput(!showDirectUrlInput)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                >
                  {showDirectUrlInput ? "▲ Hide URL" : "▼ Edit URL directly"}
                </button>
                {showDirectUrlInput && (
                  <div className="mt-1.5">
                    <input
                      type="url"
                      value={mediaUrl}
                      onChange={(e) => setConfig({ ...config, mediaUrl: e.target.value })}
                      className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50"
                      placeholder="https://..."
                    />
                  </div>
                )}
              </div>
            </div>
          ) : !isUploading ? (
            /* Case 2: No Media yet -> Show Upload Dropzone & Direct URL Input */
            <div className="space-y-2.5">
              {/* Drag & Drop or Click to Upload Card */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-1.5 bg-white ${isDragging
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-slate-300 hover:border-blue-400 hover:bg-slate-50/50"
                  }`}
              >
                <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-800 hover:text-blue-600">
                    {formatDetails.uploadLabel}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Click to browse files or drag &amp; drop
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatDetails.hint}
                </span>
              </div>

              {/* Direct URL Input */}
              <div className="pt-1 space-y-1">
                <label className="block text-[11px] font-medium text-slate-600">
                  Or paste direct file URL:
                </label>
                <input
                  type="url"
                  placeholder={
                    currentFormat === "AUDIO"
                      ? "https://example.com/audio/voice.mp3"
                      : currentFormat === "FILE"
                        ? "https://example.com/docs/guide.pdf"
                        : "https://example.com/images/card.png"
                  }
                  value={mediaUrl}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mediaUrl: e.target.value,
                      mediaType: currentFormat,
                    })
                  }
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
