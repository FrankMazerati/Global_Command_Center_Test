import {
  Home, Info, Mail, Users, Plug, RefreshCw, Code2, Headset, Lock, MessageSquare,
  CalendarDays, Cloud, Search, Briefcase, LayoutGrid, Radar, Network, ShieldCheck,
  Scale, Settings, Bot, BookOpen, UserCog, Building2, KeyRound, Sparkles, Cpu,
  BrainCircuit, LifeBuoy, GraduationCap, type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for the global hamburger navigation.
 * Every leaf has a unique slug; `to` overrides the generic module route.
 */
export type NavItem = {
  id: string;
  title: string;
  icon: LucideIcon;
  to?: "/" | "/intellidesk" | "/intellisync";
  children?: NavItem[];
};

export const NAV: NavItem[] = [
  { id: "home", title: "Home", icon: Home, to: "/" },
  { id: "about", title: "About Us", icon: Info },
  { id: "contact", title: "Contact Us", icon: Mail },
  { id: "active-directory", title: "New Active Directory", icon: Users },
  { id: "intelliconnect", title: "IntelliConnect", icon: Plug },
  {
    id: "intellisync-group", title: "IntelliSync", icon: RefreshCw,
    children: [
      { id: "intellisync", title: "IntelliSync Engine", icon: RefreshCw, to: "/intellisync" },
      { id: "mysync", title: "MySync", icon: UserCog },
      { id: "company-sync", title: "Company Sync", icon: Building2 },
      { id: "central-authorization", title: "Central Authorization", icon: KeyRound },
    ],
  },
  { id: "connect-build", title: "Connect & Build", icon: Code2 },
  { id: "intellidesk", title: "IntelliDesk", icon: Headset, to: "/intellidesk" },
  { id: "intelliaccess", title: "IntelliAccess", icon: Lock },
  { id: "intellichat", title: "IntelliChat", icon: MessageSquare },
  { id: "intellicalendar", title: "IntelliCalendar", icon: CalendarDays },
  { id: "intellidrive", title: "IntelliDrive", icon: Cloud },
  { id: "intellisearch", title: "IntelliSearch", icon: Search },
  { id: "business-center", title: "My Business Center", icon: Briefcase },
  { id: "workspace", title: "Collaboration & Productivity", icon: LayoutGrid },
  {
    id: "command-center", title: "Command Center", icon: Radar,
    children: [
      { id: "network-operations", title: "Network Operations", icon: Network },
      { id: "security-operations", title: "Security Operations", icon: ShieldCheck },
      { id: "governance", title: "Governance", icon: Scale },
      { id: "administration", title: "Administration", icon: Settings },
    ],
  },
  {
    id: "ai-systems", title: "AI Systems", icon: Bot,
    children: [
      { id: "trinity", title: "Trinity", icon: Sparkles },
      { id: "maximus", title: "Maximus", icon: Cpu },
      { id: "optimus", title: "Optimus", icon: BrainCircuit },
      { id: "help-buddy", title: "Help Buddy", icon: LifeBuoy },
    ],
  },
  {
    id: "knowledge", title: "Knowledge & Learning", icon: BookOpen,
    children: [
      { id: "knowledge-base", title: "Knowledge Base", icon: BookOpen },
      { id: "user-guide", title: "User Guide", icon: GraduationCap },
    ],
  },
];

export function flattenNav(items: NavItem[] = NAV): NavItem[] {
  return items.flatMap((i) => (i.children ? flattenNav(i.children) : [i]));
}

export function findNav(slug: string): NavItem | undefined {
  return flattenNav().find((i) => i.id === slug);
}
