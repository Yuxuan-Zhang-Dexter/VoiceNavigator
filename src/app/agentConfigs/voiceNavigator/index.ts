import voiceControlAgent from "./voiceControlAgent";
import greeter from "./greeter";
import image2txtAgent from "./image2txtAgent" ;
import voiceNavigatorAgent from "./voiceNavigatorAgent";
import { injectTransferTools } from "../utils";

// greeter.downstreamAgents = [voiceControlAgent, image2txtAgent]
// voiceControlAgent.downstreamAgents = [greeter]
// image2txtAgent.downstreamAgents = [greeter]


// 如果未来需要添加其他 Agents，这里可以继续扩展
const agents = injectTransferTools([
    // greeter,
    // voiceControlAgent, 
    // image2txtAgent,
    voiceNavigatorAgent]);

export default agents;
