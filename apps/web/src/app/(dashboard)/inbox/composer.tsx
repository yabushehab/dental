"use client";

import { useActionState, useRef, useState } from "react";
import { sendMessageAction } from "@/lib/actions/inbox";

export function Composer({
  conversationId,
  canFreeText,
  templates,
}: {
  conversationId: string;
  canFreeText: boolean;
  templates: Array<{ id: string; name: string; body: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    sendMessageAction.bind(null, conversationId),
    {},
  );
  const [templateId, setTemplateId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <form ref={formRef} action={formAction} className="border-t border-gray-100 p-3">
      {!canFreeText && (
        <p className="mb-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
          24-hour reply window closed — send an approved template.
        </p>
      )}
      {state.error && (
        <p className="mb-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>
      )}
      <div className="flex items-end gap-2">
        {canFreeText && !templateId && (
          <textarea
            name="text"
            rows={2}
            placeholder="Type a reply…"
            className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        )}
        {(templateId || !canFreeText) && (
          <div className="flex-1">
            <input type="hidden" name="templateId" value={templateId} />
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Choose a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {selectedTemplate && (
              <p className="mt-1 rounded bg-gray-50 px-2 py-1 text-xs text-gray-500">
                {selectedTemplate.body}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1">
          {canFreeText && (
            <button
              type="button"
              onClick={() => setTemplateId(templateId ? "" : (templates[0]?.id ?? ""))}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
              title="Toggle template mode"
            >
              {templateId ? "Text" : "Template"}
            </button>
          )}
          <button
            type="submit"
            disabled={pending || (!canFreeText && !templateId)}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? "…" : "Send"}
          </button>
        </div>
      </div>
    </form>
  );
}
