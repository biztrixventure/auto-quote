"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import Youtube from "@tiptap/extension-youtube";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImagePicker, uploadImage } from "./ImagePicker";

type Props = {
  initialHtml: string;
  onChange: (html: string) => void;
  onWords?: (words: number) => void;
  /** Bump `reset.token` to replace the content (e.g. restoring an earlier version). */
  reset?: { token: number; html: string };
};

function Btn({ on, label, onClick, disabled, children }: { on?: boolean; label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-sm font-semibold transition disabled:opacity-35 ${on ? "bg-asphalt text-white" : "text-asphalt hover:bg-[#EEF0F3]"}`}
    >
      {children}
    </button>
  );
}

const I = (d: string) => (
  <svg aria-hidden width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const Sep = () => <span aria-hidden className="mx-1 h-5 w-px bg-[#E4E7EC]" />;

function youtubeUrl(raw: string) {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com") return u.toString();
  } catch {}
  return null;
}

export function RichEditor({ initialHtml, onChange, onWords, reset }: Props) {
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  async function insertFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return false;
    setUploading(true);
    try {
      for (const file of images) {
        const img = await uploadImage(file);
        editorRef.current?.chain().focus().setImage({ src: img.url, alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") }).run();
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
    return true;
  }

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: null, target: null } },
      }),
      Image.configure({ inline: false }),
      TableKit.configure({ table: { resizable: false } }),
      Youtube.configure({ nocookie: true, width: 640, height: 360, modestBranding: true }),
      Placeholder.configure({ placeholder: "Start writing your post… Paste or drop images straight in." }),
      CharacterCount,
    ],
    content: initialHtml,
    editorProps: {
      attributes: { class: "post-content px-6 py-6 sm:px-10" },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.some((f) => f.type.startsWith("image/"))) {
          void insertFiles(files);
          return true;
        }
        return false;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []);
        if (files.some((f) => f.type.startsWith("image/"))) {
          event.preventDefault();
          void insertFiles(files);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.isEmpty ? "" : e.getHTML());
      onWords?.(e.storage.characterCount.words());
    },
    onCreate: ({ editor: e }) => onWords?.(e.storage.characterCount.words()),
  });
  editorRef.current = editor;

  useEffect(() => {
    if (!editor || !reset || reset.token === 0) return;
    editor.commands.setContent(reset.html, { emitUpdate: true });
  }, [editor, reset?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return <div className="min-h-[480px] animate-pulse rounded-xl border border-[#E4E7EC] bg-white" />;
  const c = () => editor.chain().focus();
  const inTable = editor.isActive("table");
  const block = editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : editor.isActive("heading", { level: 4 }) ? "h4" : "p";

  function setLink() {
    const prev = (editor!.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt("Link address (https://… or a page like /quote/auto). Leave empty to remove the link.", prev);
    if (url === null) return;
    const v = url.trim();
    if (!v) return c().extendMarkRange("link").unsetLink().run();
    const href = /^(https?:\/\/|\/|mailto:|tel:)/i.test(v) ? v : `https://${v}`;
    c().extendMarkRange("link").setLink({ href }).run();
  }

  function addVideo() {
    const raw = window.prompt("Paste a YouTube video link");
    if (!raw) return;
    const url = youtubeUrl(raw);
    if (!url) return window.alert("That isn't a YouTube link.");
    c().setYoutubeVideo({ src: url }).run();
  }

  return (
    <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-[#EEF0F3] bg-white/95 px-2 py-1.5 backdrop-blur">
        <Btn label="Undo (Ctrl+Z)" onClick={() => c().undo().run()} disabled={!editor.can().undo()}>{I("M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3")}</Btn>
        <Btn label="Redo (Ctrl+Shift+Z)" onClick={() => c().redo().run()} disabled={!editor.can().redo()}>{I("m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3")}</Btn>
        <Sep />
        <select
          aria-label="Text style"
          value={block}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") c().setParagraph().run();
            else c().setHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 }).run();
          }}
          className="h-8 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm font-medium"
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
          <option value="h4">Small heading</option>
        </select>
        <Sep />
        <Btn label="Bold (Ctrl+B)" on={editor.isActive("bold")} onClick={() => c().toggleBold().run()}><b>B</b></Btn>
        <Btn label="Italic (Ctrl+I)" on={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}><i className="font-serif">I</i></Btn>
        <Btn label="Underline (Ctrl+U)" on={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}><u>U</u></Btn>
        <Btn label="Strikethrough" on={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}><s>S</s></Btn>
        <Btn label="Inline code" on={editor.isActive("code")} onClick={() => c().toggleCode().run()}>{I("m8 7-5 5 5 5M16 7l5 5-5 5")}</Btn>
        <Sep />
        <Btn label="Bulleted list" on={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}>{I("M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01")}</Btn>
        <Btn label="Numbered list" on={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}>{I("M10 6h10M10 12h10M10 18h10M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1")}</Btn>
        <Btn label="Quote" on={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}>{I("M7 7H4v6h3l-1 4M17 7h-3v6h3l-1 4")}</Btn>
        <Btn label="Code block" on={editor.isActive("codeBlock")} onClick={() => c().toggleCodeBlock().run()}>{I("M4 4h16v16H4zM9 9l-2 3 2 3M15 9l2 3-2 3")}</Btn>
        <Btn label="Divider line" onClick={() => c().setHorizontalRule().run()}>{I("M3 12h18")}</Btn>
        <Sep />
        <Btn label="Link" on={editor.isActive("link")} onClick={setLink}>{I("M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7")}</Btn>
        <Btn label="Image" onClick={() => setPicker(true)} disabled={uploading}>{I("M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9h.01")}</Btn>
        <Btn label="YouTube video" onClick={addVideo}>{I("M22 8.5a3 3 0 0 0-2-2C18.2 6 12 6 12 6s-6.2 0-8 .5a3 3 0 0 0-2 2A31 31 0 0 0 1.5 12 31 31 0 0 0 2 15.5a3 3 0 0 0 2 2c1.8.5 8 .5 8 .5s6.2 0 8-.5a3 3 0 0 0 2-2 31 31 0 0 0 .5-3.5 31 31 0 0 0-.5-3.5zM10 15V9l5 3z")}</Btn>
        <Btn label="Table" on={inTable} onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} disabled={inTable}>{I("M3 4h18v16H3zM3 10h18M3 15h18M9 4v16M15 4v16")}</Btn>
        <Btn label="Clear formatting" onClick={() => c().unsetAllMarks().clearNodes().run()}>{I("M4 7V4h16v3M9 20h6M12 4v16M3 3l18 18")}</Btn>
        {uploading && <span className="ml-2 text-xs font-medium text-road">Uploading image…</span>}

        {inTable && (
          <div className="flex w-full flex-wrap gap-1 border-t border-[#EEF0F3] pt-1.5 text-xs">
            {([
              ["+ Row", () => c().addRowAfter().run()],
              ["+ Column", () => c().addColumnAfter().run()],
              ["− Row", () => c().deleteRow().run()],
              ["− Column", () => c().deleteColumn().run()],
              ["Header row", () => c().toggleHeaderRow().run()],
              ["Delete table", () => c().deleteTable().run()],
            ] as [string, () => void][]).map(([l, fn]) => (
              <button key={l} type="button" onMouseDown={(e) => e.preventDefault()} onClick={fn} className="rounded-md border border-[#E4E7EC] px-2 py-1 font-semibold hover:bg-[#F2F4F7]">
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      <EditorContent editor={editor} />

      <ImagePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(img) => c().setImage({ src: img.url, alt: img.alt ?? "" }).run()}
      />
    </div>
  );
}
