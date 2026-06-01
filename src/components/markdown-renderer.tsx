"use client";

import { type ComponentProps, useCallback, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function CodeBlock({ children, ...props }: ComponentProps<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = preRef.current?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  return (
    <div className="group relative my-4">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 z-10 rounded-md px-2 py-1 text-xs
          bg-zinc-800 text-zinc-400 opacity-0 group-hover:opacity-100
          hover:bg-zinc-700 hover:text-zinc-200
          transition-all duration-150
          border border-zinc-700"
        aria-label="复制代码"
      >
        {copied ? "已复制 ✓" : "复制"}
      </button>
      <pre ref={preRef} {...props}>
        {children}
      </pre>
    </div>
  );
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={["prose prose-invert prose-zinc max-w-none", className]
      .filter(Boolean)
      .join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeAutolinkHeadings, {
            behavior: "append",
            properties: {
              className: "anchor-link",
              ariaHidden: true,
              tabIndex: -1,
            },
          }],
          rehypeHighlight,
        ]}
        components={{
          pre: CodeBlock,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
