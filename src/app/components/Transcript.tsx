"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "@/app/types";
import Image from "next/image";
import { useTranscript } from "@/app/contexts/TranscriptContext";

export interface TranscriptProps {
  userText: string; // 用户输入文本的值
  setUserText: (val: string) => void; // 用于更新用户输入文本的函数
  onSendMessage: () => void; // 发送消息的回调函数
  canSend: boolean; // 是否可以发送消息
  onLogEvent?: (eventName: string, eventData?: any) => void; // 添加 onLogEvent 回调函数
}

function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  onLogEvent, // 添加解构 onLogEvent
}: TranscriptProps) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null); // 对话框的引用，用于滚动控制
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]); // 存储之前的对话记录
  const [justCopied, setJustCopied] = useState(false); // 是否刚刚完成复制
  const inputRef = useRef<HTMLInputElement | null>(null); // 输入框的引用

  // 监听屏幕大小
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

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

  // 计算动态样式
  const fontSize = `${screenSize.height * 0.018}px`; // 1.8% 屏幕高度
  const smallFontSize = `${screenSize.height * 0.015}px`; // 1.5% 屏幕高度
  const timestampFontSize = `${screenSize.height * 0.014}px`; // 时间戳字体 1.4% 屏幕高度
  const bubblePadding = `${screenSize.height * 0.010}px ${screenSize.width * 0.015}px`; // 使 padding 依赖屏幕尺寸
  const breadcrumbPadding = `${screenSize.height * 0.001}px ${screenSize.width * 0.001}px`; // BREADCRUMB 类型的 padding
  const inputHeight = `${screenSize.height * 0.05}px`; // 输入框高度 6% 屏幕高度
  const buttonSize = `${screenSize.height * 0.04}px`; // 按钮大小 5% 屏幕高度

  function scrollToBottom() {
    // 滚动到对话框底部
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }

  useEffect(() => {
    // 自动滚动到底部，当有新消息或更新消息时
    const hasNewMessage = transcriptItems.length > prevLogs.length;
    const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
      const oldItem = prevLogs[index];
      return (
        oldItem &&
        (newItem.title !== oldItem.title || newItem.data !== oldItem.data)
      );
    });

    if (hasNewMessage || hasUpdatedMessage) {
      scrollToBottom();
    }

    // 获取最新的对话内容
    if (hasNewMessage) {
      const latestMessage = transcriptItems[transcriptItems.length - 1]?.title || "";
      
      console.log("New transcript message:", latestMessage); // 调试信息

      // 检查是否包含 "function call: transferAgents"
      if (onLogEvent && latestMessage.includes("function call:")) {
        console.log("Triggering switching1.gif");
        onLogEvent("transcript_updated", latestMessage);
      }
    }

    setPrevLogs(transcriptItems);
  }, [transcriptItems, onLogEvent]);

    
  // Autofocus on text box input on load
  useEffect(() => {
    // 自动聚焦到输入框
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  const handleCopyTranscript = async () => {
    // 复制对话内容到剪贴板
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white min-h-0 rounded-xl">
      {/* 对话框的顶部，包含复制按钮 */}
      <div className="relative flex-1 min-h-0">
        {/* <button
          onClick={handleCopyTranscript}
          className={`absolute w-20 top-3 right-5 mr-1 z-10 text-sm px-3 py-2 rounded-full bg-gray-200 hover:bg-gray-300`}
        >
          {justCopied ? "Copied!" : "Copy"}
        </button> */}
        {/* 如果刚复制过显示 "Copied!"，否则显示 "Copy" */}
        {/* ----------------------------去掉了暂时没用的copy功能---------------------------- */}

        {/* 对话记录内容区域 */}
        <div
          ref={transcriptRef}
          className="overflow-auto p-4 flex flex-col gap-y-4 h-full"
        >
          {transcriptItems.map((item) => {
            const { itemId, type, role, data, expanded, timestamp, title = "", isHidden } = item;

            if (isHidden) {
              return null; // 如果记录被标记为隐藏，则不显示
            }

            if (type === "MESSAGE") {
              // 普通消息类型
              const isUser = role === "user"; // 判断是否是用户消息
              const baseContainer = "flex justify-end flex-col"; // 容器的基础样式
              const containerClasses = `${baseContainer} ${isUser ? "items-end" : "items-start"}`; // 根据消息来源设置对齐方式
              const bubbleBase = `max-w-lg p-3 rounded-xl ${
                isUser ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-black"
              }`; // 消息气泡的样式
              const isBracketedMessage = title.startsWith("[") && title.endsWith("]"); // 判断是否带有括号
              const messageStyle = isBracketedMessage ? "italic text-gray-400" : ""; // 带括号的消息样式
              const displayTitle = isBracketedMessage ? title.slice(1, -1) : title; // 去掉括号的内容

              return (
                <div key={itemId} className={containerClasses}>
                  <div className={bubbleBase} style={{ padding: bubblePadding, fontSize: fontSize }}>
                    {/* 显示消息时间戳 */}
                    <div className={`text-xs ${isUser ? "text-gray-400" : "text-gray-500"} font-mono`} style={{fontSize: timestampFontSize}}>
                      {timestamp}
                    </div>
                    {/* 显示消息内容 */}
                    <div className={`whitespace-pre-wrap ${messageStyle}`}>
                      <ReactMarkdown>{displayTitle}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            } else if (type === "BREADCRUMB") {
              // 特殊消息类型，比如function和switch agent
              return (
                <div
                  key={itemId}
                  className="flex flex-col justify-start items-start text-gray-500 text-sm"
                  style={{ padding: breadcrumbPadding }}
                >
                  <span className="text-xs font-mono" style={{ fontSize: timestampFontSize }}>{timestamp}</span>
                  <div
                    className={`whitespace-pre-wrap flex items-center font-mono text-sm text-gray-800 ${
                      data ? "cursor-pointer" : ""
                    }`}
                    onClick={() => data && toggleTranscriptItemExpand(itemId)}
                    style={{ fontSize: fontSize, padding: breadcrumbPadding,}}
                  >
                    {data && (
                      <span
                        className={`text-gray-400 mr-1 transform transition-transform duration-200 select-none font-mono ${
                          expanded ? "rotate-90" : "rotate-0"
                        }`}
                      >
                        ▶
                      </span>
                    )}
                    {title}
                  </div>
                  {expanded && data && (
                    <div className="text-gray-800 text-left">
                      <pre className="border-l-2 ml-1 border-gray-200 whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2" style={{ fontSize: smallFontSize }}>
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            } else {
              // 未知类型的消息
              return (
                <div
                  key={itemId}
                  className="flex justify-center text-gray-500 text-sm italic font-mono"
                >
                  Unknown item type: {type}{" "}
                  <span className="ml-2 text-xs" style={{ fontSize: timestampFontSize }}>{timestamp}</span>
                </div>
              );
            }
          })}
        </div>
      </div>

      {/* 输入框和发送按钮 */}
      <div className="p-1 flex items-center gap-x-2 flex-shrink-0 border-t border-gray-200">
        <input
          ref={inputRef}
          type="text"
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSend) {
              onSendMessage();
            }
          }}
          className="flex-1 px-4 py-2 focus:outline-none"
          style={{
            height: inputHeight,
            fontSize: fontSize,
          }}
          placeholder="Type a message..." // 占位符文本
        />
        <button
          onClick={onSendMessage}
          disabled={!canSend || !userText.trim()}
          className="bg-gray-900 text-white rounded-full px-0.5 py-0.5 disabled:opacity-50"
          style={{
            width: buttonSize,
            height: buttonSize,
            fontSize: fontSize,
          }}
        >
          <Image src="arrow.svg" alt="Send" width={24} height={24} />
        </button>
      </div>
    </div>
  );
}

export default Transcript;
