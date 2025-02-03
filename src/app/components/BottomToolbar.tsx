import React from "react";
import { SessionStatus } from "@/app/types";

interface BottomToolbarProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  isPTTActive: boolean;
  setIsPTTActive: (val: boolean) => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (val: boolean) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (val: boolean) => void;
}

function BottomToolbar({
  sessionStatus,
  onToggleConnection,
  isPTTActive,
  setIsPTTActive,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
}: BottomToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  function getConnectionButtonLabel() {
    if (isConnected) return "Disconnect";
    if (isConnecting) return "Connecting...";
    return "Connect";
  }

  function getConnectionButtonClasses() {
    const baseClasses = "text-white text-base p-2 w-36 rounded-full h-full";
    const cursorClass = isConnecting ? "cursor-not-allowed" : "cursor-pointer";

    if (isConnected) {
      // Connected -> label "Disconnect" -> red
      return `bg-red-600 hover:bg-red-700 ${cursorClass} ${baseClasses}`;
    }
    // Disconnected or connecting -> label is either "Connect" or "Connecting" -> black
    return `bg-black hover:bg-gray-900 ${cursorClass} ${baseClasses}`;
  }

  return (
    <div className="p-4 flex flex-row items-center justify-center gap-x-8" style={{ height: '11vh' }}>
      <button
        onClick={onToggleConnection}
        className={getConnectionButtonClasses()}
        disabled={isConnecting}
        style={{ width: "20vh", height: "6vh", fontSize: "2.4vh", lineHeight: "1", padding: "0", alignItems: "center", justifyContent: "center", }}
      >
        {getConnectionButtonLabel()}
      </button>

      <div className="flex flex-row items-center gap-2">
        <input
          id="push-to-talk"
          type="checkbox"
          checked={isPTTActive}
          onChange={e => setIsPTTActive(e.target.checked)}
          disabled={!isConnected}
          className="w-4 h-4"
        />
        <label htmlFor="push-to-talk" className="flex items-center cursor-pointer" style={{ fontSize: "2.4vh" }}>
          Push to talk
        </label>
        <button
          onMouseDown={handleTalkButtonDown}
          onMouseUp={handleTalkButtonUp}
          onTouchStart={handleTalkButtonDown}
          onTouchEnd={handleTalkButtonUp}
          disabled={!isPTTActive}
          className={
            (isPTTUserSpeaking ? "bg-gray-300" : "bg-gray-200") +
            " py-1 px-4 cursor-pointer rounded-full" +
            (!isPTTActive ? " bg-gray-100 text-gray-400" : "")
          } style={{width: "8vh", height: "5vh", fontSize: "2vh", lineHeight: "1", padding: "0", alignItems: "center", justifyContent: "center",}}
        >
          Talk
        </button>
      </div>

      <div className="flex flex-row items-center gap-2">
        <input
          id="audio-playback"
          type="checkbox"
          checked={isAudioPlaybackEnabled}
          onChange={e => setIsAudioPlaybackEnabled(e.target.checked)}
          disabled={!isConnected}
          className="w-4 h-4"
        />
        <label htmlFor="audio-playback" className="flex items-center cursor-pointer" style={{ fontSize: "2.4vh" }}>
          Audio playback
        </label>
      </div>

      <div className="flex flex-row items-center gap-2">
        <input
          id="logs"
          type="checkbox"
          checked={isEventsPaneExpanded}
          onChange={e => setIsEventsPaneExpanded(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="logs" className="flex items-center cursor-pointer" style={{ fontSize: "2.4vh" }}>
          Logs
        </label>
      </div>
    </div>
  );
}

export default BottomToolbar;
