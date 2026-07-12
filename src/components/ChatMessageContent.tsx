interface ChatMessageContentProps {
  content: string;
}

const IMAGE_PATTERN = /\[img:(https?:\/\/[^\]]+)\]/g;

export const isImageMessage = (content: string) => IMAGE_PATTERN.test(content);

export const formatImageContent = (url: string) => `[img:${url}]`;

const ChatMessageContent = ({ content }: ChatMessageContentProps) => {
  const parts: { type: "text" | "image"; value: string }[] = [];
  let lastIndex = 0;
  const regex = /\[img:(https?:\/\/[^\]]+)\]/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "image", value: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  if (parts.length === 0) return <p>{content}</p>;

  return (
    <div className="space-y-1">
      {parts.map((part, i) =>
        part.type === "image" ? (
          <a key={i} href={part.value} target="_blank" rel="noopener noreferrer">
            <img
              src={part.value}
              alt="Chat image"
              className="max-w-[240px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
            />
          </a>
        ) : (
          <p key={i}>{part.value}</p>
        )
      )}
    </div>
  );
};

export default ChatMessageContent;
