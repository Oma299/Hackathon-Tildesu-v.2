"use client"

import Link from "next/link"
import { Play, Star, Lock, Crown, BookOpen } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

type NodeType = "start" | "lesson" | "checkpoint" | "trophy"

interface RoadmapNode {
  type: NodeType
  state: "current" | "locked"
  /** lesson number for the side label, undefined for start/checkpoint/trophy */
  lesson?: number
}

// 8 nodes total. Nothing is pre-completed: the journey begins at "Начало".
const NODES: RoadmapNode[] = [
  { type: "start", state: "current" },
  { type: "lesson", state: "locked", lesson: 1 },
  { type: "lesson", state: "locked", lesson: 2 },
  { type: "checkpoint", state: "locked" },
  { type: "lesson", state: "locked", lesson: 3 },
  { type: "lesson", state: "locked", lesson: 4 },
  { type: "checkpoint", state: "locked" },
  { type: "trophy", state: "locked" },
]

const W = 360 // column width in px
const TOP = 100 // top padding before first node
const SPACING = 160 // vertical gap between nodes
const AMP = 110 // horizontal sway amplitude

function getPoint(i: number) {
  return {
    x: W / 2 + Math.sin(i * 0.9) * AMP,
    y: TOP + i * SPACING,
  }
}

export function RoadmapBoard({
  title,
  variant = "fluent",
}: {
  title: string
  variant?: "kids" | "fluent"
}) {
  const { t } = useLanguage()

  const points = NODES.map((_, i) => getPoint(i))
  const height = TOP * 2 + (NODES.length - 1) * SPACING

  // Smooth white path connecting all node centers
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const my = (p0.y + p1.y) / 2
    d += ` C ${p0.x} ${my}, ${p1.x} ${my}, ${p1.x} ${p1.y}`
  }

  // Kids path is friendlier: lighter tint, thicker rounded nodes
  const tint = variant === "kids" ? "bg-secondary/30" : "bg-primary/25"

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-primary/15 bg-card shadow-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 bg-primary px-5 py-4 text-primary-foreground">
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary-foreground/80">{t("roadmap.label")}</p>
          <h3 className="truncate text-base font-bold leading-tight">{title}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">
          {`0 / ${NODES.filter((n) => n.type === "lesson").length}`}
        </span>
      </div>

      {/* Jungle roadmap */}
      <div
        className="relative"
        style={{
          backgroundImage: "url(/roadmap-jungle.png)",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "repeat-y",
        }}
      >
        {/* subtle brand tint so the path reads clearly over the forest */}
        <div className={`absolute inset-0 ${tint}`} aria-hidden="true" />

        <div className="relative mx-auto" style={{ width: W, height }}>
          {/* connecting white line */}
          <svg width={W} height={height} className="absolute left-0 top-0" fill="none" aria-hidden="true">
            <path d={d} stroke="white" strokeOpacity="0.45" strokeWidth={16} strokeLinecap="round" />
            <path d={d} stroke="white" strokeWidth={6} strokeLinecap="round" strokeDasharray="1 26" />
          </svg>

          {/* nodes */}
          {NODES.map((node, i) => {
            const p = points[i]
            // place the side label on whichever side has more room
            const labelSide = p.x > W / 2 ? "left" : "right"
            return (
              <RoadmapNodeButton
                key={i}
                node={node}
                variant={variant}
                labelSide={labelSide}
                style={{ left: p.x, top: p.y }}
              />
            )
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-border bg-card px-5 py-4">
        <Link
          href="/register"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t("roadmap.start")}
        </Link>
      </div>
    </div>
  )
}

function RoadmapNodeButton({
  node,
  variant,
  labelSide,
  style,
}: {
  node: RoadmapNode
  variant: "kids" | "fluent"
  labelSide: "left" | "right"
  style: React.CSSProperties
}) {
  const { t } = useLanguage()
  const isLocked = node.state === "locked"
  const isCurrent = node.state === "current"

  const size = node.type === "trophy" ? 80 : node.type === "start" ? 76 : node.type === "checkpoint" ? 72 : 64

  const baseColor = isLocked
    ? "bg-card/70 text-muted-foreground border-card"
    : "bg-primary text-primary-foreground border-primary-foreground"

  // Kids get extra-rounded, chunky nodes
  const rounding = variant === "kids" ? "rounded-[1.75rem]" : "rounded-full"

  const Icon =
    node.type === "trophy"
      ? Crown
      : node.type === "checkpoint"
        ? Star
        : node.type === "start"
          ? Play
          : isLocked
            ? Lock
            : BookOpen

  // Side label text
  let label: string | null = null
  if (node.type === "start") label = t("roadmap.node.start")
  else if (node.type === "lesson" && node.lesson) label = t("roadmap.node.lesson").replace("{n}", String(node.lesson))
  else if (node.type === "checkpoint") label = t("roadmap.node.check")
  else if (node.type === "trophy") label = t("roadmap.node.finish")

  return (
    <div className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={style}>
      <button
        type="button"
        aria-label={label ?? node.type}
        className={`relative flex items-center justify-center border-4 shadow-lg transition-transform hover:scale-105 ${rounding} ${baseColor} ${
          isCurrent ? "ring-4 ring-card/70" : ""
        }`}
        style={{ width: size, height: size }}
      >
        <Icon
          className={node.type === "trophy" || node.type === "start" ? "h-9 w-9" : "h-7 w-7"}
          fill={node.type === "checkpoint" && !isLocked ? "currentColor" : "none"}
        />
      </button>

      {/* Side label */}
      {label && (
        <span
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold shadow-md ${
            isCurrent ? "bg-card text-primary" : "bg-card/90 text-foreground/70"
          } ${labelSide === "left" ? "right-full mr-3" : "left-full ml-3"}`}
        >
          {label}
        </span>
      )}
    </div>
  )
}
