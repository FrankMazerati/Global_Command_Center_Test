import data from "./menu-data.json";

export type MenuSection = {
  title: string;
  slug: string;
  description: string;
  groups: { name: string; items: string[] }[];
};
export const menu: MenuSection[] = data as MenuSection[];
