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
}

function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
}: TranscriptProps) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null); // 对话框的引用，用于滚动控制
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]); // 存储之前的对话记录
  const [justCopied, setJustCopied] = useState(false); // 是否刚刚完成复制
  const inputRef = useRef<HTMLInputElement | null>(null); // 输入框的引用

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

    setPrevLogs(transcriptItems);
  }, [transcriptItems]);
    
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
                  <div className={bubbleBase}>
                    {/* 显示消息时间戳 */}
                    <div className={`text-xs ${isUser ? "text-gray-400" : "text-gray-500"} font-mono`}>
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
              // 面包屑类型
              return (
                <div
                  key={itemId}
                  className="flex flex-col justify-start items-start text-gray-500 text-sm"
                >
                  <span className="text-xs font-mono">{timestamp}</span>
                  <div
                    className={`whitespace-pre-wrap flex items-center font-mono text-sm text-gray-800 ${
                      data ? "cursor-pointer" : ""
                    }`}
                    onClick={() => data && toggleTranscriptItemExpand(itemId)}
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
                      <pre className="border-l-2 ml-1 border-gray-200 whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2">
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
                  <span className="ml-2 text-xs">{timestamp}</span>
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
          placeholder="Type a message..." // 占位符文本
        />
        <button
          onClick={onSendMessage}
          disabled={!canSend || !userText.trim()}
          className="bg-gray-900 text-white rounded-full px-0.5 py-0.5 disabled:opacity-50"
        >
          <Image src="arrow.svg" alt="Send" width={24} height={24} />
        </button>
      </div>
    </div>
  );
}

export default Transcript;
