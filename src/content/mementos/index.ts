import mementoHtml5 from "./memento-html5.json";
import mementoCss3 from "./memento-css3.json";
import mementoJs from "./memento-js.json";
import mementoPhp from "./memento-php.json";
import mementoSql from "./memento-sql.json";

export interface MementoSnippet {
  title: string;
  language: "html" | "css" | "javascript" | "php" | "sql";
  targetFile?: string | undefined;
  keywords: string[];
  code: string;
  explanation?: string | undefined;
}

export interface MementoSection {
  id: string;
  title: string;
  description: string;
  snippets: MementoSnippet[];
  keyPoints?: string[] | undefined;
}

export interface MementoCard {
  id: "html5" | "css3" | "js" | "php" | "sql";
  badge: string;
  title: string;
  shortTitle: string;
  description: string;
  piegeBac: string;
  sections: MementoSection[];
  iconName: "FileCode" | "Palette" | "Braces" | "Server" | "Database";
}

export const MEMENTO_CARDS: MementoCard[] = [
  {
    ...(mementoHtml5 as Omit<MementoCard, "iconName">),
    iconName: "FileCode",
  },
  {
    ...(mementoCss3 as Omit<MementoCard, "iconName">),
    iconName: "Palette",
  },
  {
    ...(mementoJs as Omit<MementoCard, "iconName">),
    iconName: "Braces",
  },
  {
    ...(mementoPhp as Omit<MementoCard, "iconName">),
    iconName: "Server",
  },
  {
    ...(mementoSql as Omit<MementoCard, "iconName">),
    iconName: "Database",
  },
];
