import voiceControlAgent from "./voiceControlAgent";
import greeter from "./greeter";
import { injectTransferTools } from "../utils";

greeter.downstreamAgents = [voiceControlAgent]
voiceControlAgent.downstreamAgents = [greeter]

// 如果未来需要添加其他 Agents，这里可以继续扩展
const agents = injectTransferTools([
    greeter,
    voiceControlAgent]);

export default agents;
