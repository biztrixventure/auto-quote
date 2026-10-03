"use client";

import { useState } from "react";
import { RichEditor } from "../../blog/RichEditor";

/** Rich editor inside a normal form: keeps a hidden field in sync (the server cleans the HTML). */
export function ContentField({ initialHtml }: { initialHtml: string }) {
  const [html, setHtml] = useState(initialHtml);
  return (
    <>
      <RichEditor initialHtml={initialHtml} onChange={setHtml} />
      <input type="hidden" name="contentHtml" value={html} />
    </>
  );
}
