/* eslint-disable react/react-in-jsx-scope */
import { useRef, useState, useEffect } from "react";
import { useHighlighter } from "./CnstrcHighlighter";

const PALETTES = {
  blue: {
    border: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.04)",
    accent: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.10)",
  },
  purple: {
    border: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.04)",
    accent: "#8b5cf6",
    glow: "rgba(139, 92, 246, 0.10)",
  },
  teal: {
    border: "#14b8a6",
    bg: "rgba(20, 184, 166, 0.04)",
    accent: "#14b8a6",
    glow: "rgba(20, 184, 166, 0.10)",
  },
  pink: {
    border: "#ec4899",
    bg: "rgba(236, 72, 153, 0.04)",
    accent: "#ec4899",
    glow: "rgba(236, 72, 153, 0.10)",
  },
};

/**
 * Two modes:
 *  1. Standalone (no children) — label tag that highlights its parent on expand.
 *  2. Wrapper (with children)  — colored border around the child element + label below.
 */
function CnstrcOverlayTag({ attrs, color = "blue", children }) {
  const { enabled } = useHighlighter();
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef(null);
  const tagRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  const palette = PALETTES[color] || PALETTES.blue;

  const lines = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => (v === "" ? k : `${k}='${v}'`));

  // Measure content for slide animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [lines.length, expanded, enabled]);

  // Standalone mode: highlight parent element when expanded
  useEffect(() => {
    if (children || !enabled) return;

    const el = tagRef.current?.parentElement;
    if (!el) return;

    if (expanded) {
      el.style.outline = `2px solid ${palette.accent}`;
      el.style.outlineOffset = "-1px";
      el.style.boxShadow = `0 0 0 3px ${palette.glow}`;
      el.style.transition = "outline 0.2s ease, box-shadow 0.2s ease";
    }

    return () => {
      if (el) {
        el.style.outline = "";
        el.style.outlineOffset = "";
        el.style.boxShadow = "";
      }
    };
  }, [children, expanded, enabled, palette]);

  // Wrapper mode: pass children through when disabled
  if (children && !enabled) return children;
  if (!enabled) return null;
  if (lines.length === 0) return children || null;

  const collapsedText =
    lines[0].length > 35 ? `${lines[0].slice(0, 32)}…` : lines[0];

  const toggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setExpanded((prev) => !prev);
  };

  const labelEl = (
    <div
      className="cnstrc-overlay-tag"
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") toggle(e);
      }}
      role="button"
      tabIndex={0}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "5px",
        padding: "2px 7px",
        fontSize: "10px",
        fontFamily: "'SF Mono','Monaco','Menlo','Consolas',monospace",
        lineHeight: "16px",
        color: "#374151",
        backgroundColor: expanded ? palette.bg : "transparent",
        border: `1px solid ${expanded ? palette.border : `${palette.border}30`}`,
        borderLeft: `3px solid ${palette.accent}`,
        borderRadius: "4px",
        cursor: "pointer",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
        overflow: "visible",
        whiteSpace: "pre",
        width: "fit-content",
        maxWidth: "none",
        zIndex: 2,
        position: "relative",
      }}
    >
      <span
        style={{
          color: palette.accent,
          fontWeight: 700,
          fontSize: "8px",
          lineHeight: "16px",
          flexShrink: 0,
          userSelect: "none",
          transition: "transform 0.2s ease",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          display: "inline-block",
          width: "8px",
          textAlign: "center",
        }}
      >
        &#9654;
      </span>
      <div
        ref={contentRef}
        style={{
          overflow: "hidden",
          transition: "max-height 0.25s ease",
          maxHeight: expanded ? `${contentHeight + 10}px` : "16px",
          whiteSpace: "pre",
        }}
      >
        {expanded
          ? lines.join("\n")
          : `${collapsedText}${lines.length > 1 ? `  (+${lines.length - 1})` : ""}`}
      </div>
    </div>
  );

  // Standalone mode
  if (!children) {
    return (
      <div ref={tagRef} style={{ overflow: "visible", margin: "3px 0" }}>
        {labelEl}
      </div>
    );
  }

  // Wrapper mode — colored border around child + label below
  return (
    <div
      style={{
        position: "relative",
        outline: `2px solid ${palette.accent}`,
        outlineOffset: "-1px",
        borderRadius: "4px",
        boxShadow: `0 0 0 3px ${palette.glow}`,
        transition: "outline-color 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {children}
      <div style={{ marginTop: "2px", overflow: "visible" }}>
        {labelEl}
      </div>
    </div>
  );
}

export default CnstrcOverlayTag;
