"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import Image from "next/image";

// UI components
import Transcript from "./components/Transcript";
import Events from "./components/Events";
import BottomToolbar from "./components/BottomToolbar";

// Types
import { AgentConfig, SessionStatus } from "@/app/types";

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useHandleServerEvent } from "./hooks/useHandleServerEvent";

// Utilities
import { createRealtimeConnection } from "./lib/realtimeConnection";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";

function App() {
  const searchParams = useSearchParams();

  const { transcriptItems, addTranscriptMessage, addTranscriptBreadcrumb } =
    useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] =
    useState<AgentConfig[] | null>(null);

  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] =
    useState<boolean>(true);

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      logClientEvent(eventObj, eventNameSuffix);
      dcRef.current.send(JSON.stringify(eventObj));
    } else {
      logClientEvent(
        { attemptedEvent: eventObj.type },
        "error.data_channel_not_open"
      );
      console.error(
        "Failed to send message - no data channel available",
        eventObj
      );
    }
  };

  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
  });

  useEffect(() => {
    let finalAgentConfig = searchParams.get("agentConfig");
    if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
      finalAgentConfig = defaultAgentSetKey;
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }

    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [searchParams]);

  useEffect(() => {
    if (selectedAgentName && sessionStatus === "DISCONNECTED") {
      connectToRealtime();
    }
  }, [selectedAgentName]);

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(
        `Agent: ${selectedAgentName}`,
        currentAgent
      );
      updateSession(true);
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      console.log(
        `updatingSession, isPTTACtive=${isPTTActive} sessionStatus=${sessionStatus}`
      );
      updateSession();
    }
  }, [isPTTActive]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    if (sessionStatus !== "DISCONNECTED") return;
    setSessionStatus("CONNECTING");

    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        return;
      }

      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement("audio");
      }
      audioElementRef.current.autoplay = isAudioPlaybackEnabled;

      const { pc, dc } = await createRealtimeConnection(
        EPHEMERAL_KEY,
        audioElementRef
      );
      pcRef.current = pc;
      dcRef.current = dc;

      dc.addEventListener("open", () => {
        logClientEvent({}, "data_channel.open");
      });
      dc.addEventListener("close", () => {
        logClientEvent({}, "data_channel.close");
      });
      dc.addEventListener("error", (err: any) => {
        logClientEvent({ error: err }, "data_channel.error");
      });
      dc.addEventListener("message", (e: MessageEvent) => {
        handleServerEventRef.current(JSON.parse(e.data));
      });

      setDataChannel(dc);
    } catch (err) {
      console.error("Error connecting to realtime:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  const disconnectFromRealtime = () => {
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      pcRef.current.close();
      pcRef.current = null;
    }
    setDataChannel(null);
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);

    logClientEvent({}, "disconnected");
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          id,
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      },
      "(simulated user text message)"
    );
    sendClientEvent(
      { type: "response.create" },
      "(trigger response after simulated user text message)"
    );
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    sendClientEvent(
      { type: "input_audio_buffer.clear" },
      "clear audio buffer on session update"
    );

    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

    const turnDetection = isPTTActive
      ? null
      : {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
          create_response: true,
        };

    const instructions = currentAgent?.instructions || "";
    const tools = currentAgent?.tools || [];

    const sessionUpdateEvent = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions,
        voice: "coral",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: turnDetection,
        tools,
      },
    };

    sendClientEvent(sessionUpdateEvent);

    if (shouldTriggerResponse) {
      sendSimulatedUserMessage("hi");
    }
  };

  const cancelAssistantSpeech = async () => {
    const mostRecentAssistantMessage = [...transcriptItems]
      .reverse()
      .find((item) => item.role === "assistant");

    if (!mostRecentAssistantMessage) {
      console.warn("can't cancel, no recent assistant message found");
      return;
    }
    if (mostRecentAssistantMessage.status === "DONE") {
      console.log("No truncation needed, message is DONE");
      return;
    }

    sendClientEvent({
      type: "conversation.item.truncate",
      item_id: mostRecentAssistantMessage?.itemId,
      content_index: 0,
      audio_end_ms: Date.now() - mostRecentAssistantMessage.createdAtMs,
    });
    sendClientEvent(
      { type: "response.cancel" },
      "(cancel due to user interruption)"
    );
  };

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    cancelAssistantSpeech();

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: userText.trim() }],
        },
      },
      "(send user text message)"
    );
    setUserText("");

    sendClientEvent({ type: "response.create" }, "trigger response");
  };

  const handleTalkButtonDown = () => {
    if (sessionStatus !== "CONNECTED" || dataChannel?.readyState !== "open")
      return;
    cancelAssistantSpeech();

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: "input_audio_buffer.clear" }, "clear PTT buffer");
  };

  const handleTalkButtonUp = () => {
    if (
      sessionStatus !== "CONNECTED" ||
      dataChannel?.readyState !== "open" ||
      !isPTTUserSpeaking
    )
      return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: "input_audio_buffer.commit" }, "commit PTT");
    sendClientEvent({ type: "response.create" }, "trigger response PTT");
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      connectToRealtime();
    }
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentConfig = e.target.value;
    const url = new URL(window.location.toString());
    url.searchParams.set("agentConfig", newAgentConfig);
    window.location.replace(url.toString());
  };

  const handleSelectedAgentChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newAgentName = e.target.value;
    setSelectedAgentName(newAgentName);
  };

  const [currentGif, setCurrentGif] = useState("connecting"); // 当前显示的 GIF，默认是 connecting

  // 根据事件更新 GIF 状态的回调函数
  // const handleLogEvent = (eventName: string, eventData?: any) => {
  //   console.log("Received event:", eventName, eventData); // 让控制台打印调试信息
  
  //   if (eventName === "output_audio_buffer.audio_stopped") {
  //     setCurrentGif("waiting2"); // 切换到等待状态
  //   } else if (eventName === "conversation.item.created") {
  //     setCurrentGif("loading3"); // 切换到加载状态
  //   } else if (eventName === "transcript_updated" && eventData) {
  //     // 检查文本内容是否包含 "function call: transferAgents"
  //     if (typeof eventData === "string" && eventData.includes("function call:")) {
  //       console.log("Switching to switching1.gif"); // 调试信息
  //       setCurrentGif("switching1");
  //     }
  //   }
  // };

  const handleLogEvent = (eventName: string, eventData?: any) => {
    console.log("Received event:", eventName, eventData); // 让控制台打印调试信息
  
    if (eventName === "output_audio_buffer.stopped") {
      setCurrentGif("waiting2"); // 切换到等待状态
    } else if (eventName === "conversation.item.created") {
      setCurrentGif("loading3"); // 切换到加载状态
    } else if (eventName === "transcript_updated" && eventData) {
      // 检查文本内容是否包含 "function call:"
      if (typeof eventData === "string" && eventData.includes("function call:")) {
        console.log("检测到 function call, 暂停语音输入");
        setIsPTTActive(false); // 暂停语音输入
        setCurrentGif("switching1"); // 切换 GIF 状态
      } else {
        console.log("恢复语音输入");
        setIsPTTActive(true); // 恢复语音输入
      }
    }
  };

  useEffect(() => {
    console.log(`Session status changed: ${sessionStatus}`);
  
    if (sessionStatus === "DISCONNECTED") {
      setCurrentGif("connecting"); // 断开连接时显示 "connecting.gif"
    } else if (sessionStatus === "CONNECTED") {
      setCurrentGif("waiting2"); // 连接成功后回到默认等待状态
    }
  }, [sessionStatus]);

  // log显示框 是否存在，基于屏幕比例的判断
  const [isEventsPaneExpanded, setIsEventsPaneExpanded] = useState<boolean>(true);
  const [isWideScreen, setIsWideScreen] = useState<boolean>(true);
  const [isUserLogEnabled, setIsUserLogEnabled] = useState<boolean>(true); // 记录用户是否手动启用 `log`

  useEffect(() => {
    // 监听屏幕尺寸变化
    const updateScreenRatio = () => {
      const screenRatio = window.innerWidth / window.innerHeight;
      setIsWideScreen(screenRatio >= 1);
    };

    window.addEventListener("resize", updateScreenRatio);
    updateScreenRatio();

    return () => window.removeEventListener("resize", updateScreenRatio);
  }, []);

  useEffect(() => {
    // 读取本地存储的 `log` 展示设置
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      const isLogEnabled = storedLogsExpanded === "true";
      setIsUserLogEnabled(isLogEnabled); // 记录用户的手动偏好
      setIsEventsPaneExpanded(isLogEnabled); // 仅在初始化时尊重用户设置
    }
  }, []);

  useEffect(() => {
    // 监听屏幕变化 & 用户选择，确保 `log` 状态正确
    if (!isWideScreen) {
      setIsEventsPaneExpanded(false); // 屏幕窄时，自动隐藏 `log`
    } else if (isUserLogEnabled) {
      setIsEventsPaneExpanded(true); // 屏幕恢复宽比 1:1 以上，并且用户允许 `log`，则恢复显示
    }
  }, [isWideScreen, isUserLogEnabled]);

  useEffect(() => {
    // 存储 `log` 的展开状态
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  // Tool bar 是否存在，基于屏幕比例的判断
  const [isToolbarVisible, setIsToolbarVisible] = useState<boolean>(true);

  useEffect(() => {
    const updateScreenRatio = () => {
      const screenRatio = window.innerWidth / window.innerHeight;
      setIsWideScreen(screenRatio >= 1);
      setIsToolbarVisible(screenRatio >= 1); // 当 H > W 时隐藏工具栏
    };

    window.addEventListener("resize", updateScreenRatio);
    updateScreenRatio();

    return () => window.removeEventListener("resize", updateScreenRatio);
  }, []);

  // body 的 overflow 逻辑
  useEffect(() => {
    if (!isWideScreen || !isToolbarVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isWideScreen, isToolbarVisible]);


  // 新增状态：控制导航栏是否显示
  const [isNavbarVisible, setIsNavbarVisible] = useState<boolean>(true);

  useEffect(() => {
    const updateScreenRatio = () => {
      const screenRatio = window.innerWidth / window.innerHeight;
      setIsWideScreen(screenRatio >= 1);
      setIsNavbarVisible(screenRatio >= 1); // 当 H > W 时隐藏导航栏
    };

    window.addEventListener("resize", updateScreenRatio);
    updateScreenRatio();

    return () => window.removeEventListener("resize", updateScreenRatio);
  }, []);

  // 处理 `transform` 使导航栏隐藏或显示
  const navbarStyles: React.CSSProperties = {
    transform: isNavbarVisible ? "translateY(0)" : "translateY(-200%)",
    transition: "transform 0.3s ease-in-out",
  };

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        audioElementRef.current.pause();
      }
    }
  }, [isAudioPlaybackEnabled]);

  const agentSetKey = searchParams.get("agentConfig") || "default";

  return (
    <div className="text-base flex flex-col h-screen bg-gray-100 text-gray-800 relative">
      {/* 顶部导航栏，包含页面标题和下拉选择框 */}
      <div className="p-3 text-lg font-semibold flex justify-between items-center">
        <div className="flex items-center">
          {/* 图标，点击后刷新页面 */}
          <div onClick={() => window.location.reload()} style={{ cursor: "pointer" }}>
            <Image
              src="/VoiceNavigatorIcon.svg" // 图标路径
              alt="VNLOGO" // 图标替代文本
              width={24} // 图标宽度
              height={24} // 图标高度
              className="mr-[0.8vw]" // 图标右侧外边距
              style={{width: "2vw",height: "2vw",}}
            />
          </div>
          <div style={{ fontSize: "1.5vw"}}>
            {/* 页面标题 */}
            VoiceNavigator <span className="text-gray-500">Agents</span>
          </div>
        </div>
  
        <div className="flex items-center" style={navbarStyles}>
          {/* 场景选择框 */}
          <label className="flex items-center text-base gap-1 mr-[0.5vw] font-medium" style={{ fontSize: "1.3vw" }}>
            Scenario
          </label>
          <div className="relative inline-block">
            {/* 场景下拉选择框 */}
            <select
              value={agentSetKey} // 当前选中的场景
              onChange={handleAgentChange} // 场景切换事件
              className="appearance-none border border-gray-300 rounded-lg text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
              style={{
                fontSize: "1vw",
                padding: "0vw 0.7vw",
                height: "5vh",
                width: "13vw",
                display: "flex",       // 让 select 内部的文本使用 flex 布局
                alignItems: "center",  // 垂直居中
                justifyContent: "center", // 水平居中
              }}
            >
              {/* 动态生成场景选项 */}
              {Object.keys(allAgentSets).map((agentKey) => (
                <option key={agentKey} value={agentKey}>
                  {agentKey}
                </option>
              ))}
            </select>
            {/* 下拉框右侧的图标 */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
              <svg className="h-[2vw] w-[2vw]" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
  
          {/* 如果场景已选择，显示 Agent 选择框 */}
          {agentSetKey && (
            <div className="flex items-center ml-6">
              <label className="flex items-center text-base gap-1 mr-[0.5vw] font-medium" style={{ fontSize: "1.3vw" }}>
                Agent
              </label>
              <div className="relative inline-block">
                {/* Agent 下拉选择框 */}
                <select
                  value={selectedAgentName} // 当前选中的 Agent
                  onChange={handleSelectedAgentChange} // Agent 切换事件
                  className="appearance-none border border-gray-300 rounded-lg text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
                  style={{
                    fontSize: "1vw",
                    padding: "0vw 0.7vw",
                    height: "5vh",
                    width: "13vw",
                    display: "flex",       // 让 select 内部的文本使用 flex 布局
                    alignItems: "center",  // 垂直居中
                    justifyContent: "center", // 水平居中
                  }}
                >
                  {/* 动态生成 Agent 选项 */}
                  {selectedAgentConfigSet?.map((agent) => (
                    <option key={agent.name} value={agent.name}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                {/* 下拉框右侧的图标 */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
                  <svg className="h-[2vw] w-[2vw]" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 新增的上半部分区域，用于显示动态 GIF */}
      <div className="h-1/3 bg-gray-100 flex justify-center items-center animate-float">
        {/* 动态切换的 GIF 图片 */}
        <img
          src={`/animation/${currentGif}.gif`} // 根据 currentGif 动态加载 GIF
          alt="Dynamic Animation"
          className="w-3/4 h-3/4 object-contain"
        />
      </div>
  
      {/* 主体内容部分，左右分布的布局 */}
      <div className="flex flex-1 gap-2 px-2 overflow-hidden relative">
        {/* 左侧：Transcript 组件 */}
        <Transcript
          userText={userText} // 用户输入文本的状态
          setUserText={setUserText} // 更新用户输入文本的函数
          onSendMessage={handleSendTextMessage} // 发送消息的事件
          canSend={
            sessionStatus === "CONNECTED" && // 检查会话状态是否已连接
            dcRef.current?.readyState === "open" // 检查连接是否打开
          }
          onLogEvent={handleLogEvent} // 确保 `handleLogEvent` 被正确传递
        />
  
        {/* 右侧：Events 组件 */}
        <Events isExpanded={isEventsPaneExpanded} onLogEvent={handleLogEvent}/> {/* 日志面板是否展开 */}
      </div>

      <div
        className={`transition-transform duration-300 ease-in-out ${
          isToolbarVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* 底部工具栏 */}
        <BottomToolbar
          sessionStatus={sessionStatus} // 会话状态
          onToggleConnection={onToggleConnection} // 切换连接状态的事件
          isPTTActive={isPTTActive} // PTT（按住说话）状态
          setIsPTTActive={setIsPTTActive} // 设置 PTT 状态的函数
          isPTTUserSpeaking={isPTTUserSpeaking} // 检查用户是否在讲话
          handleTalkButtonDown={handleTalkButtonDown} // 按下说话按钮事件
          handleTalkButtonUp={handleTalkButtonUp} // 释放说话按钮事件
          isEventsPaneExpanded={isEventsPaneExpanded} // 日志面板是否展开
          setIsEventsPaneExpanded={setIsEventsPaneExpanded} // 设置日志面板展开状态
          isAudioPlaybackEnabled={isAudioPlaybackEnabled} // 音频播放是否启用
          setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled} // 设置音频播放状态
        />
      </div>
    </div>
  );  
}

export default App;
