"use client";

import React, { useRef, useEffect, useState } from "react";
import { useEvent } from "@/app/contexts/EventContext";
import { LoggedEvent } from "@/app/types";

export interface EventsProps {
  isExpanded: boolean; // 控制日志面板是否展开
  onLogEvent?: (eventName: string) => void; // 回调函数，用于传递日志事件名称
}

function Events({ isExpanded, onLogEvent }: EventsProps) {
  const [prevEventLogs, setPrevEventLogs] = useState<LoggedEvent[]>([]);
  const eventLogsContainerRef = useRef<HTMLDivElement | null>(null);

  const { loggedEvents, toggleExpand } = useEvent();

  // 监听屏幕宽度 & 高度，动态调整组件大小
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 动态计算大小
  const fontSize = `${screenSize.height * 0.018}px`; // 1.8% 屏幕高度
  const smallFontSize = `${screenSize.height * 0.014}px`; // 1.4% 屏幕高度
  const logPadding = `${screenSize.height * 0.0045}px ${screenSize.width * 0.015}px`; // 基于屏幕尺寸的 padding

  // 日志容器大小调整
  const containerHeight = isExpanded ? "47vh" : "0"; // 控制日志面板高度
  const containerWidth = isExpanded ? "40vw" : "0"; // 控制日志面板宽度

  useEffect(() => {
    const hasNewEvent = loggedEvents.length > prevEventLogs.length;

    if (isExpanded && hasNewEvent && eventLogsContainerRef.current) {
      eventLogsContainerRef.current.scrollTop =
        eventLogsContainerRef.current.scrollHeight;

      const latestEvent = loggedEvents[loggedEvents.length - 1];
      if (latestEvent && onLogEvent) {
        onLogEvent(latestEvent.eventName);
      }
    }

    setPrevEventLogs(loggedEvents);
  }, [loggedEvents, isExpanded, onLogEvent]);

  return (
    <div
      className="transition-all duration-300 ease-in-out bg-white rounded-xl flex flex-col"
      ref={eventLogsContainerRef}
      style={{
        width: containerWidth,
        height: containerHeight,
        overflow: "auto",
        opacity: isExpanded ? 1 : 0,
      }}
    >
      {isExpanded && (
        <div>
          {/* 日志标题 */}
          <div
            className="font-semibold px-6 py-4 sticky top-0 z-10 border-b bg-white"
            style={{ fontSize: fontSize }}
          >
            Logs
          </div>

          {/* 日志内容 */}
          <div>
            {loggedEvents.map((log) => {
              const arrowInfo = log.direction === "client"
                ? { symbol: "▲", color: "#7f5af0" }
                : log.direction === "server"
                ? { symbol: "▼", color: "#2cb67d" }
                : { symbol: "•", color: "#555" };

              const isError =
                log.eventName.toLowerCase().includes("error") ||
                log.eventData?.response?.status_details?.error != null;

              return (
                <div
                  key={log.id}
                  className="border-t border-gray-200 font-mono"
                  style={{
                    padding: logPadding, // 使用动态 `padding`
                    fontSize: fontSize, // 让日志文本大小适应屏幕
                  }}
                >
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center flex-1">
                      <span
                        style={{ color: arrowInfo.color, fontSize: fontSize }}
                        className="ml-1 mr-2"
                      >
                        {arrowInfo.symbol}
                      </span>
                      <span
                        className={
                          "flex-1 " +
                          (isError ? "text-red-600" : "text-gray-800")
                        }
                        style={{ fontSize: fontSize }}
                      >
                        {log.eventName}
                      </span>
                    </div>
                    <div
                      className="text-gray-500 ml-1 whitespace-nowrap"
                      style={{ fontSize: smallFontSize }}
                    >
                      {log.timestamp}
                    </div>
                  </div>

                  {log.expanded && log.eventData && (
                    <div className="text-gray-800 text-left">
                      <pre
                        className="border-l-2 ml-1 border-gray-200 whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2"
                        style={{ fontSize: smallFontSize }}
                      >
                        {JSON.stringify(log.eventData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Events;
