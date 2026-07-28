import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

const CONSTRUCTOR_FAVICON_URL = "https://constructor.io/favicon.ico";

const OVERLAY_CONTAINER_ID = "cnstrc-highlight-container";

// Context so child components (e.g. CnstrcOverlayTag) can read the enabled state
const HighlighterContext = createContext({ enabled: false });
export function useHighlighter() {
  return useContext(HighlighterContext);
}

// Color palette for items (always blue)
const ITEM_PALETTE = {
  border: "#3b82f6",
  bg: "rgba(59, 130, 246, 0.06)",
  borderSolid: "1px solid rgba(59, 130, 246, 0.25)",
  accent: "3px solid #3b82f6",
};

// Rotating color palettes for containers — each container gets a unique color
const CONTAINER_PALETTES = [
  {
    border: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.06)",
    borderSolid: "1px solid rgba(139, 92, 246, 0.25)",
    accent: "3px solid #8b5cf6",
  },
  {
    border: "#14b8a6",
    bg: "rgba(20, 184, 166, 0.06)",
    borderSolid: "1px solid rgba(20, 184, 166, 0.25)",
    accent: "3px solid #14b8a6",
  },
  {
    border: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.06)",
    borderSolid: "1px solid rgba(245, 158, 11, 0.25)",
    accent: "3px solid #f59e0b",
  },
  {
    border: "#ec4899",
    bg: "rgba(236, 72, 153, 0.06)",
    borderSolid: "1px solid rgba(236, 72, 153, 0.25)",
    accent: "3px solid #ec4899",
  },
  {
    border: "#10b981",
    bg: "rgba(16, 185, 129, 0.06)",
    borderSolid: "1px solid rgba(16, 185, 129, 0.25)",
    accent: "3px solid #10b981",
  },
];

const ROW_THRESHOLD = 30; // px — items within this vertical distance are considered same row

const SPECIAL_TAGS = [
  "data-cnstrc-search",
  "data-cnstrc-search-term",
  "data-cnstrc-num-results",
  "data-cnstrc-browse",
  "data-cnstrc-filter-name",
  "data-cnstrc-filter-value",
];

// Responsive configuration based on viewport width
function getResponsiveConfig() {
  const width = window.innerWidth;
  if (width < 640) {
    return {
      fontSize: 9,
      padding: "2px 4px",
      maxLabelWidth: 200,
      lineHeight: 13,
    };
  }
  if (width < 1024) {
    return {
      fontSize: 10,
      padding: "3px 5px",
      maxLabelWidth: 280,
      lineHeight: 14,
    };
  }
  return {
    fontSize: 11,
    padding: "4px 6px",
    maxLabelWidth: 360,
    lineHeight: 16,
  };
}

// 2D rectangle overlap check
function rectsOverlap(a, b) {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

function CnstrcHighlighter() {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem("cnstrc-highlighter-enabled");
    return stored === null ? true : stored === "true";
  });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [faviconError, setFaviconError] = useState(false);

  const overlayContainerRef = useRef(null);
  const overlayMapRef = useRef(new Map());
  const labelRectsRef = useRef([]);
  const rafIdRef = useRef(null);
  const redrawTimeoutRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Track mobile breakpoint for toggle button responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Create or retrieve the single overlay container
  const getOverlayContainer = useCallback(() => {
    if (!overlayContainerRef.current) {
      const container = document.createElement("div");
      container.id = OVERLAY_CONTAINER_ID;
      container.style.cssText =
        "position:absolute;top:0;left:0;width:0;height:0;pointer-events:none;z-index:9999;";
      document.body.appendChild(container);
      overlayContainerRef.current = container;
    }
    return overlayContainerRef.current;
  }, []);

  const clearHighlights = useCallback(() => {
    if (overlayContainerRef.current) {
      overlayContainerRef.current.remove();
      overlayContainerRef.current = null;
    }
    overlayMapRef.current.clear();
    labelRectsRef.current = [];
  }, []);

  // Viewport-aware label position computation
  const computeLabelPosition = useCallback(
    (rect, labelWidth, labelHeight, isSpecial, elementType) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 8;

      let left;
      let top;

      if (isSpecial) {
        // Preferred: above the element
        left = rect.left;
        top = rect.top - labelHeight - 8;
        // Flip below if it would go off-screen top
        if (top < margin) {
          top = rect.bottom + 4;
        }
      } else if (elementType === "item-card" || elementType === "autocomplete-item") {
        // Below the element to avoid covering content
        left = rect.left;
        top = rect.bottom + 4;
      } else if (rect.width > 60 && rect.height > labelHeight + 10) {
        // Inside the element (top-left corner)
        left = rect.left + 5;
        top = rect.top + 5;
      } else {
        // Below the element
        left = rect.left;
        top = rect.bottom + 4;
      }

      // Clamp to viewport boundaries
      left = Math.max(margin, Math.min(left, vw - labelWidth - margin));
      top = Math.max(margin, Math.min(top, vh - labelHeight - margin));

      // Convert to absolute (page) coordinates
      return {
        left: window.scrollX + left,
        top: window.scrollY + top,
      };
    },
    [],
  );

  // 2D collision avoidance — nudge labels down to avoid overlap
  const resolveCollision = useCallback((labelRect) => {
    const placed = labelRectsRef.current;
    const config = getResponsiveConfig();

    for (let attempts = 0; attempts < 20; attempts += 1) {
      let overlap = false;
      for (let i = 0; i < placed.length; i += 1) {
        if (rectsOverlap(labelRect, placed[i])) {
          overlap = true;
          break;
        }
      }
      if (!overlap) break;
      labelRect.top += config.lineHeight + 4;
    }

    placed.push({ ...labelRect });
    return labelRect;
  }, []);

  // Estimate label dimensions for positioning
  const estimateLabelSize = useCallback((attributes) => {
    const config = getResponsiveConfig();
    const charWidth = config.fontSize * 0.6;
    const longestLine = attributes.reduce(
      (max, attr) => Math.max(max, attr.length),
      0,
    );
    return {
      width: Math.min(config.maxLabelWidth, longestLine * charWidth + 16),
      height: attributes.length * config.lineHeight + 8,
    };
  }, []);

  // Create overlay elements for a single tracked element
  const createOverlay = useCallback(
    (element, matchingAttributes, container, palette, elementType) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Skip elements that are entirely outside the viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) return;

      const config = getResponsiveConfig();
      const isSpecial = matchingAttributes.some((l) =>
        SPECIAL_TAGS.some((tag) => l.startsWith(tag)),
      );
      const labelText = matchingAttributes.join("\n");
      const { width: estLabelWidth, height: estLabelHeight } =
        estimateLabelSize(matchingAttributes);

      // Autocomplete-related elements get higher z-index so they render above page overlays
      const isAutocomplete = element.hasAttribute("data-cnstrc-autosuggest")
        || element.hasAttribute("data-cnstrc-item-section")
        || element.hasAttribute("data-cnstrc-search-form")
        || element.hasAttribute("data-cnstrc-search-input")
        || element.hasAttribute("data-cnstrc-search-submit-btn")
        || !!element.closest("[data-cnstrc-autosuggest]");
      const boxZ = isAutocomplete ? "10050" : "9999";
      const labelZ = isAutocomplete ? "10051" : "10000";

      // Create bounding box
      const box = document.createElement("div");
      box.classList.add("cnstrc-highlight-box");
      Object.assign(box.style, {
        position: "absolute",
        border: `2px solid ${palette.border}`,
        background: palette.bg,
        left: `${window.scrollX + rect.left}px`,
        top: `${window.scrollY + rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        pointerEvents: "none",
        zIndex: boxZ,
        borderRadius: "3px",
      });

      // Create label
      const label = document.createElement("div");
      label.classList.add("cnstrc-highlight-label");
      label.innerText = labelText;
      Object.assign(label.style, {
        position: "absolute",
        backgroundColor: "rgba(255, 255, 255, 0.97)",
        color: "#1a1a1a",
        fontSize: `${config.fontSize}px`,
        fontFamily: "'SF Mono','Monaco','Menlo','Consolas',monospace",
        padding: config.padding,
        border: palette.borderSolid,
        borderLeft: palette.accent,
        whiteSpace: "pre",
        borderRadius: "4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        zIndex: labelZ,
        maxWidth: "none",
        lineHeight: `${config.lineHeight}px`,
        overflow: "hidden",
        textOverflow: "ellipsis",
        pointerEvents: "none",
      });

      // Position with viewport awareness + collision avoidance
      const pos = computeLabelPosition(
        rect,
        estLabelWidth,
        estLabelHeight,
        isSpecial,
        elementType,
      );
      const resolved = resolveCollision({
        left: pos.left,
        top: pos.top,
        width: estLabelWidth,
        height: estLabelHeight,
      });
      label.style.left = `${resolved.left}px`;
      label.style.top = `${resolved.top}px`;

      container.appendChild(box);
      container.appendChild(label);
      overlayMapRef.current.set(element, {
        box,
        label,
        attributes: matchingAttributes,
        elementType,
      });
    },
    [computeLabelPosition, resolveCollision, estimateLabelSize],
  );

  // Classify an element based on its data-cnstrc-* attributes
  // Returns: 'item-card' | 'autocomplete-item' | 'action-btn' | 'container'
  const classifyElement = useCallback((el) => {
    const hasItemId = el.hasAttribute("data-cnstrc-item-id");
    const hasProductDetail = el.hasAttribute("data-cnstrc-product-detail");
    const hasBtn = el.hasAttribute("data-cnstrc-btn");
    const hasItemSection = el.hasAttribute("data-cnstrc-item-section");

    if (hasBtn) return "action-btn";
    if (hasItemSection) return "autocomplete-item";
    if (hasItemId && !hasProductDetail) return "item-card";
    return "container";
  }, []);

  // Full redraw: scan entire DOM, create all overlays from scratch
  // Item cards are sampled to 1 per visual row to reduce clutter
  const fullRedraw = useCallback(() => {
    isDrawingRef.current = true;
    clearHighlights();
    const container = getOverlayContainer();
    labelRectsRef.current = [];

    // Phase 1: Collect all elements with data-cnstrc-* attributes
    const itemCards = [];
    const autocompleteItems = [];
    const actionBtns = [];
    const containers = [];

    document.querySelectorAll("*").forEach((el) => {
      if (
        el.closest(`#${OVERLAY_CONTAINER_ID}`) ||
        el.id === OVERLAY_CONTAINER_ID
      )
        return;

      const matchingAttributes = [];
      for (const attr of el.attributes) {
        if (attr.name.startsWith("data-cnstrc-")) {
          matchingAttributes.push(
            `${attr.name}${attr.value ? `='${attr.value}'` : ""}`,
          );
        }
      }
      if (matchingAttributes.length === 0) return;

      const type = classifyElement(el);
      const entry = { el, matchingAttributes };

      if (type === "item-card") itemCards.push(entry);
      else if (type === "autocomplete-item") autocompleteItems.push(entry);
      else if (type === "action-btn") actionBtns.push(entry);
      else containers.push(entry);
    });

    // Phase 2a: Group autocomplete items by section and pick 1 per section
    const acSections = {};
    autocompleteItems.forEach((item) => {
      const section =
        item.el.getAttribute("data-cnstrc-item-section") || "other";
      if (!acSections[section]) acSections[section] = [];
      acSections[section].push(item);
    });

    const selectedAutocomplete = new Set();
    Object.values(acSections).forEach((sectionItems) => {
      // Pick a middle item to spread overlays vertically and avoid top-of-dropdown clutter
      const idx = Math.floor(sectionItems.length / 2);
      selectedAutocomplete.add(sectionItems[idx].el);
    });

    // Phase 2b: Group item cards by visual row and pick 1 per row
    const rows = [];
    itemCards.forEach((item) => {
      const rect = item.el.getBoundingClientRect();
      let foundRow = false;
      for (let i = 0; i < rows.length; i += 1) {
        if (Math.abs(rows[i].top - rect.top) < ROW_THRESHOLD) {
          rows[i].items.push(item);
          foundRow = true;
          break;
        }
      }
      if (!foundRow) {
        rows.push({ top: rect.top, items: [item] });
      }
    });

    const selectedItems = new Set();
    rows.forEach((row, rowIndex) => {
      // Sample 1 every 2 rows for more breathing room between overlays
      if (rowIndex % 2 !== 0) return;
      // Deterministic pick: use row position so the same card is chosen across redraws
      const idx = Math.abs(Math.floor(row.top)) % row.items.length;
      selectedItems.add(row.items[idx].el);
    });

    // When autocomplete dropdown is open, only show autocomplete-related overlays
    const autosuggestOpen = !!document.querySelector("[data-cnstrc-autosuggest]");

    // Phase 3: Create overlays — containers cycle through palette, items stay blue
    let containerColorIdx = 0;
    containers.forEach(({ el, matchingAttributes }) => {
      // When autosuggest is open, only render autocomplete-related containers
      const isAcContainer = el.hasAttribute("data-cnstrc-autosuggest")
        || el.hasAttribute("data-cnstrc-search-form")
        || el.hasAttribute("data-cnstrc-search-input")
        || el.hasAttribute("data-cnstrc-search-submit-btn")
        || !!el.closest("[data-cnstrc-autosuggest]");
      if (autosuggestOpen && !isAcContainer) return;

      const pal =
        CONTAINER_PALETTES[containerColorIdx % CONTAINER_PALETTES.length];
      containerColorIdx += 1;
      createOverlay(el, matchingAttributes, container, pal, "container");
    });

    autocompleteItems.forEach(({ el, matchingAttributes }) => {
      if (selectedAutocomplete.has(el)) {
        createOverlay(el, matchingAttributes, container, ITEM_PALETTE, "autocomplete-item");
      }
    });

    if (!autosuggestOpen) {
      itemCards.forEach(({ el, matchingAttributes }) => {
        if (selectedItems.has(el)) {
          createOverlay(el, matchingAttributes, container, ITEM_PALETTE, "item-card");
        }
      });

      // Action buttons: show only if parent item card is selected (or parent is a container like PDP)
      actionBtns.forEach(({ el, matchingAttributes }) => {
        const parentItem = el.closest("[data-cnstrc-item-id]");
        if (
          !parentItem ||
          selectedItems.has(parentItem) ||
          parentItem.hasAttribute("data-cnstrc-product-detail")
        ) {
          createOverlay(el, matchingAttributes, container, ITEM_PALETTE, "action-btn");
        }
      });
    }

    // Delay clearing the drawing flag so MutationObserver microtasks
    // (fired by overlay DOM changes) still see the guard as true and are ignored
    setTimeout(() => {
      isDrawingRef.current = false;
    }, 0);
  }, [clearHighlights, getOverlayContainer, createOverlay, classifyElement]);

  // Lightweight reposition: update positions of existing overlays without recreating DOM
  const repositionAll = useCallback(() => {
    isDrawingRef.current = true;
    labelRectsRef.current = [];
    const config = getResponsiveConfig();

    overlayMapRef.current.forEach(({ box, label, attributes, elementType }, element) => {
      const rect = element.getBoundingClientRect();

      // Hide overlays for elements that are no longer visible or outside viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (rect.width === 0 || rect.height === 0 ||
          rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
        box.style.display = "none";
        label.style.display = "none";
        return;
      }

      box.style.display = "";
      label.style.display = "";

      // Update box position
      Object.assign(box.style, {
        left: `${window.scrollX + rect.left}px`,
        top: `${window.scrollY + rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });

      // Update label position with viewport clamping + collision avoidance
      const isSpecial = attributes.some((l) =>
        SPECIAL_TAGS.some((tag) => l.startsWith(tag)),
      );
      const { width: estLabelWidth, height: estLabelHeight } =
        estimateLabelSize(attributes);
      const pos = computeLabelPosition(
        rect,
        estLabelWidth,
        estLabelHeight,
        isSpecial,
        elementType,
      );
      const resolved = resolveCollision({
        left: pos.left,
        top: pos.top,
        width: estLabelWidth,
        height: estLabelHeight,
      });

      Object.assign(label.style, {
        left: `${resolved.left}px`,
        top: `${resolved.top}px`,
        fontSize: `${config.fontSize}px`,
        padding: config.padding,
        maxWidth: "none",
        lineHeight: `${config.lineHeight}px`,
      });
    });
    isDrawingRef.current = false;
  }, [computeLabelPosition, resolveCollision, estimateLabelSize]);

  // Throttled reposition via requestAnimationFrame (scroll/resize)
  const scheduleReposition = useCallback(() => {
    if (!enabled) return;
    if (rafIdRef.current) return;
    rafIdRef.current = requestAnimationFrame(() => {
      repositionAll();
      rafIdRef.current = null;
    });
  }, [enabled, repositionAll]);

  // Debounced full redraw (DOM mutations)
  const scheduleRedraw = useCallback(() => {
    if (!enabled) return;
    clearTimeout(redrawTimeoutRef.current);
    redrawTimeoutRef.current = setTimeout(fullRedraw, 300);
  }, [enabled, fullRedraw]);

  const handleToggle = useCallback(() => {
    setEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem("cnstrc-highlighter-enabled", String(newValue));
      return newValue;
    });
  }, []);

  // Toggle on/off
  useEffect(() => {
    if (enabled) {
      fullRedraw();
    } else {
      clearHighlights();
    }
  }, [enabled, fullRedraw, clearHighlights]);

  // MutationObserver: full redraw on relevant DOM changes
  useEffect(() => {
    if (!enabled) return undefined;

    const observer = new MutationObserver((mutations) => {
      if (isDrawingRef.current) return;
      const isRelevant = mutations.some((m) => {
        if (m.target.id === OVERLAY_CONTAINER_ID) return false;
        if (
          m.target.closest?.(`.${OVERLAY_CONTAINER_ID}`) ||
          m.target.closest?.(`#${OVERLAY_CONTAINER_ID}`)
        )
          return false;
        if (
          m.type === "attributes" &&
          m.attributeName &&
          !m.attributeName.startsWith("data-cnstrc-")
        )
          return false;
        return true;
      });
      if (isRelevant) scheduleRedraw();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => observer.disconnect();
  }, [enabled, scheduleRedraw]);

  // Scroll/resize: throttled lightweight reposition
  useEffect(() => {
    if (!enabled) return undefined;

    window.addEventListener("scroll", scheduleReposition, { passive: true });
    window.addEventListener("resize", scheduleReposition, { passive: true });

    return () => {
      window.removeEventListener("scroll", scheduleReposition);
      window.removeEventListener("resize", scheduleReposition);
    };
  }, [enabled, scheduleReposition]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      clearHighlights();
      clearTimeout(redrawTimeoutRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    },
    [clearHighlights],
  );

  // Render: Constructor favicon toggle button
  const faviconSize = isMobile ? "24px" : "32px";

  return (
    <HighlighterContext.Provider value={{ enabled }}>
      <button
        type="button"
        onClick={handleToggle}
        title={
          enabled
            ? "Hide data-cnstrc-* highlights"
            : "Show data-cnstrc-* highlights"
        }
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          background: enabled
            ? "rgba(255,255,255,0.95)"
            : "rgba(255,255,255,0.7)",
          border: enabled ? "2px solid #3b82f6" : "2px solid transparent",
          cursor: "pointer",
          zIndex: 10001,
          padding: "8px",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          transition: "all 0.2s ease-in-out",
          opacity: enabled ? 1 : 0.7,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        aria-label={
          enabled
            ? "Disable Constructor highlighting"
            : "Enable Constructor highlighting"
        }
      >
        {!faviconError ? (
          <img
            src={CONSTRUCTOR_FAVICON_URL}
            alt="Constructor.io"
            onError={() => setFaviconError(true)}
            style={{
              width: faviconSize,
              height: faviconSize,
              filter: enabled ? "none" : "grayscale(100%)",
              transition: "filter 0.2s ease-in-out",
            }}
          />
        ) : (
          <span
            style={{
              width: faviconSize,
              height: faviconSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isMobile ? "16px" : "20px",
              fontWeight: 700,
              color: enabled ? "#3b82f6" : "#888",
              fontFamily: "system-ui, -apple-system, sans-serif",
              transition: "color 0.2s ease-in-out",
            }}
          >
            C
          </span>
        )}
        {!isMobile && (
          <span
            style={{
              fontSize: "9px",
              fontFamily: "system-ui, -apple-system, sans-serif",
              color: enabled ? "#3b82f6" : "#888",
              fontWeight: 600,
              whiteSpace: "nowrap",
              letterSpacing: "0.02em",
              transition: "color 0.2s ease-in-out",
            }}
          >
            Toggle Overlay
          </span>
        )}
      </button>
    </HighlighterContext.Provider>
  );
}

export default CnstrcHighlighter;
