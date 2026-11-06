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
  "home-and-command-center": Headset,
  "business-products": Building2,
  "identity-and-access-management": Users,
  "productivity-and-collaboration": UsersRound,
  "service-desk-and-enterprise-operations": Radar,
  "security-risk-and-governance": ShieldCheck,
  "ai-and-business-intelligence": Bot,
  "employee-and-manager-workspace": UsersRound,
  "account-and-administration": Scale,
};
