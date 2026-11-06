import {
  Bot,
  Building2,
  GraduationCap,
  Headset,
  LayoutGrid,
  Radar,
  Scale,
  ShieldCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export const SECTION_ICONS: Record<string, LucideIcon> = {
  "my-business-center": Building2,
  "new-active-directory": Users,
  "command-center": Headset,
  productivity: LayoutGrid,
  collaboration: UsersRound,
  "knowledge-and-learning": GraduationCap,
  "ai-systems": Bot,
  "noc-center": Radar,
  security: ShieldCheck,
  governance: Scale,
};
