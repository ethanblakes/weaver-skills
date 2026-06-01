"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const HLJS_BASE = "https://unpkg.com/@highlightjs/cdn-assets@11.11.0/styles";

export function HighlightStylesheet() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const href = mounted && resolvedTheme === "light"
    ? `${HLJS_BASE}/github.min.css`
    : `${HLJS_BASE}/github-dark.min.css`;

  return <link rel="stylesheet" href={href} />;
}
