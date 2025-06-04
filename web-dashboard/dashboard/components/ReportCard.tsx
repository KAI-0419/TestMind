import React from "react";

interface ReportCardProps {
  title: string;
  content?: string | React.JSX.Element;
}

export default function ReportCard({ title, content }: ReportCardProps) {
  if (!content) return null;
  return (
    <div className="bg-white shadow-md rounded-xl p-4 mb-4">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      {typeof content === "string" ? <p>{content}</p> : content}
    </div>
  );
}