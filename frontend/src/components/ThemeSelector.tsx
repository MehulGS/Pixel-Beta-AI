import { Moon, Sun, Monitor } from "lucide-react";
import type { Theme } from "../types";

interface Props {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const OPTIONS: { value: Theme; label: string; Icon: typeof Moon }[] = [
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeSelector({ theme, setTheme }: Props) {
  return (
    <div className="theme-selector" role="group" aria-label="Color theme">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          className={`theme-btn ${theme === value ? "theme-btn--active" : ""}`}
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          title={`${label} theme`}
        >
          <Icon size={14} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
