"use client";

import { useEffect, useState } from "react";

export function ToastNotice({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "info" | "success";
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className={`toast-notice ${tone}`}>
      {message}
    </div>
  );
}
