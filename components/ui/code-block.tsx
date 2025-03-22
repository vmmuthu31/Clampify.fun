import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock = ({ language, code }: CodeBlockProps) => {
  const cleanedCode = code
    .replace(/^\n/, "")
    .replace(/\n\s+$/, "\n")
    .replace(/^\s+/gm, "");

  return (
    <div className="rounded-md overflow-hidden">
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        showLineNumbers={true}
        customStyle={{
          margin: 0,
          borderRadius: "0.375rem",
        }}
      >
        {cleanedCode}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;
