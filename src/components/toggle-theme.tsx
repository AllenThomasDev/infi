import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentTheme, toggleTheme } from "@/actions/theme";
import { Button } from "@/components/ui/button";

export default function ToggleTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      const { local, system } = await getCurrentTheme();
      const activeTheme = local === "system" || !local ? system : local;
      setIsDark(activeTheme === "dark");
    }

    loadTheme().catch(console.error);
  }, []);

  async function handleToggleTheme() {
    await toggleTheme();
    setIsDark((current) => !current);
  }

  return (
    <Button
      aria-label="Toggle theme"
      onClick={handleToggleTheme}
      size="icon-sm"
      variant="outline"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  );
}
