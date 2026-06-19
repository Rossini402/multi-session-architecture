import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownBody({ children }: { children: string }) {
  return (
    <div className="prose-radar">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: c }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline-offset-2 hover:underline"
            >
              {c}
            </a>
          ),
          input: (props) =>
            props.type === "checkbox" ? (
              <input
                {...props}
                disabled
                className="mr-1.5 align-middle accent-accent"
              />
            ) : (
              <input {...props} />
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
