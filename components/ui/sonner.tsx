"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "@/hooks/useTheme"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  // 用项目自有的主题系统（scheme 跟随 <html>.dark），而非 next-themes（未挂 Provider）。
  const { scheme } = useTheme()

  return (
    <Sonner
      theme={scheme}
      richColors
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "color-mix(in srgb, var(--success) 12%, var(--surface))",
          "--success-text": "var(--success)",
          "--success-border": "color-mix(in srgb, var(--success) 35%, var(--border))",
          "--info-bg": "color-mix(in srgb, var(--info) 12%, var(--surface))",
          "--info-text": "var(--info)",
          "--info-border": "color-mix(in srgb, var(--info) 35%, var(--border))",
          "--warning-bg": "color-mix(in srgb, var(--warning) 12%, var(--surface))",
          "--warning-text": "var(--warning)",
          "--warning-border": "color-mix(in srgb, var(--warning) 35%, var(--border))",
          "--error-bg": "color-mix(in srgb, var(--error) 12%, var(--surface))",
          "--error-text": "var(--error)",
          "--error-border": "color-mix(in srgb, var(--error) 35%, var(--border))",
          "--border-radius": "var(--radius, 0.5rem)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
