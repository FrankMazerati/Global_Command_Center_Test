import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Scan, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PageZoom({ children }: { children: ReactNode }) {
  const transform = useRef<ReactZoomPanPinchRef>(null);
  const content = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1280);
  const [scale, setScale] = useState(1);
  const [fitted, setFitted] = useState(true);
  const fit = () => {
    const el = content.current;
    const box = frame.current;
    const api = transform.current;
    if (!el || !box || !api) return;
    // Fit to width only. Shrinking to fit height made tablet layouts unreadably small; a page
    // that is taller than the viewport should scroll instead of scaling down.
    const next = Math.min(box.clientWidth / el.offsetWidth, 1);
    api.setTransform((box.clientWidth - el.offsetWidth * next) / 2, 8, Math.max(0.1, next), 200);
    setFitted(true);
  };
  useEffect(() => {
    const resize = () => setWidth(Math.max(360, window.innerWidth));
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    const el = content.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (fitted) fit();
    });
    observer.observe(el);
    const timer = window.setTimeout(() => {
      if (fitted) fit();
    }, 100);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [fitted, width]);
  return (
    <div ref={frame} className="zoom-page bg-background">
      <TransformWrapper
        ref={transform}
        minScale={0.1}
        maxScale={3}
        limitToBounds={false}
        wheel={{ activationKeys: ["Control", "Meta"], step: 0.002 }}
        panning={{ excluded: ["input", "select", "textarea", "button", "a", "scroll-blue"] }}
        doubleClick={{ disabled: true }}
        onTransform={(_, state) => setScale(state.scale)}
      >
        <TransformComponent wrapperClass="page-zoom-viewport" contentClass="page-zoom-content">
          <div ref={content} style={{ width }}>
            {children}
          </div>
        </TransformComponent>
        <div
          className="fixed bottom-3 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-md border border-primary/50 bg-popover p-1 shadow-[var(--glow)]"
          aria-label="Page zoom"
        >
          <Button
            variant="ghost"
            size="icon"
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() => {
              setFitted(false);
              transform.current?.zoomOut();
            }}
          >
            <ZoomOut />
          </Button>
          <span className="w-12 text-center text-xs tabular-nums" aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() => {
              setFitted(false);
              transform.current?.zoomIn();
            }}
          >
            <ZoomIn />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Fit whole page"
            aria-label="Fit whole page"
            onClick={fit}
          >
            <Scan />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Actual size"
            aria-label="Actual size"
            onClick={() => {
              setFitted(false);
              transform.current?.setTransform(0, 0, 1);
            }}
          >
            <RotateCcw />
          </Button>
        </div>
      </TransformWrapper>
    </div>
  );
}
