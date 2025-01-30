import { AllAgentConfigsType } from "@/app/types";
import frontDeskAuthentication from "./frontDeskAuthentication";
import customerServiceRetail from "./customerServiceRetail";
import simpleExample from "./simpleExample";
import voiceNavigator from "./voiceNavigator"; // 修改导入路径以匹配实际文件名

export const allAgentSets: AllAgentConfigsType = {
  // frontDeskAuthentication,
  // customerServiceRetail,
  // simpleExample,
  voiceNavigator, // 使用正确的变量名
};

export const defaultAgentSetKey = "voiceNavigator";
