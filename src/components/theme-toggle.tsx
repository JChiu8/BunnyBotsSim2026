import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { buttonVariants } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const themes = ["system", "light", "dark"] as const

export function ThemeToggle() {
  const { theme = "system", setTheme } = useTheme()

  const currentTheme = themes.includes(theme as (typeof themes)[number])
    ? (theme as (typeof themes)[number])
    : "system"
  const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length]
  const Icon = currentTheme === "light" ? Sun : currentTheme === "dark" ? Moon : Monitor

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label="Change color theme"
        className={buttonVariants({ size: "icon", variant: "ghost" })}
        onClick={() => setTheme(nextTheme)}
      >
        <Icon />
      </TooltipTrigger>
      <TooltipContent>Theme: {currentTheme}</TooltipContent>
    </Tooltip>
  )
}
