"use client";

import { useState, useEffect } from "react";
import {
  AutomationPreviewProps,
  useSimulationEngine,
  PreviewHeaderToolbar,
  MobilePhonePreview,
  DesktopWebPreview,
} from "./preview";

export default function AutomationPreview({
  isOpen,
  onClose,
  viewMode = "mobile",
  nodes,
  edges,
  automationName,
  userName = "instance",
  userProfilePicture,
}: AutomationPreviewProps) {
  const [currentViewMode, setCurrentViewMode] = useState<"mobile" | "desktop">(viewMode);

  // Synchronize initial viewMode
  useEffect(() => {
    if (viewMode) setCurrentViewMode(viewMode);
  }, [viewMode]);

  const {
    messages,
    isTyping,
    customInput,
    setCustomInput,
    simulatedIsFollowing,
    setSimulatedIsFollowing,
    messagesEndRef,
    startSimulation,
    handleButtonClick,
    handleSendMessage,
  } = useSimulationEngine({
    nodes,
    edges,
    userName,
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex flex-col items-center max-w-full max-h-[96vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <PreviewHeaderToolbar
          automationName={automationName}
          simulatedIsFollowing={simulatedIsFollowing}
          setSimulatedIsFollowing={setSimulatedIsFollowing}
          currentViewMode={currentViewMode}
          setCurrentViewMode={setCurrentViewMode}
          startSimulation={startSimulation}
          onClose={onClose}
        />

        {currentViewMode === "mobile" ? (
          <MobilePhonePreview
            userName={userName}
            userProfilePicture={userProfilePicture}
            messages={messages}
            isTyping={isTyping}
            customInput={customInput}
            setCustomInput={setCustomInput}
            handleSendMessage={handleSendMessage}
            handleButtonClick={handleButtonClick}
            messagesEndRef={messagesEndRef}
            onClose={onClose}
          />
        ) : (
          <DesktopWebPreview
            userName={userName}
            userProfilePicture={userProfilePicture}
            messages={messages}
            isTyping={isTyping}
            customInput={customInput}
            setCustomInput={setCustomInput}
            handleSendMessage={handleSendMessage}
            handleButtonClick={handleButtonClick}
            messagesEndRef={messagesEndRef}
          />
        )}
      </div>
    </div>
  );
}
