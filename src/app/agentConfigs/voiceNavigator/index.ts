import voiceControlAgent from "./voiceControlAgent";
import { injectTransferTools } from "../utils";

// 如果未来需要添加其他 Agents，这里可以继续扩展
const agents = injectTransferTools([voiceControlAgent]);

export default agents;
