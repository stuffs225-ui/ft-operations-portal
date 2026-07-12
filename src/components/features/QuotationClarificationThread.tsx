// ── Quotation clarification thread (C1) ───────────────────────────────────────
// A two-way, multi-round, logged conversation between the coordinator and the
// salesman on a quotation, with optional attachments. Additive to the existing
// status flow — posting a message never changes the quotation status here.

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Paperclip, Send, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  listClarifications, addClarification,
  type QuotationClarification, type ClarificationDirection,
} from '../../lib/quotationClarifications';
import type { UserRole } from '../../types';

interface Props {
  quotationId: string;
  userId: string | null;
  userName: string | null;
  userRole: UserRole | null;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function QuotationClarificationThread({ quotationId, userId, userName, userRole }: Props) {
  const [items, setItems] = useState<QuotationClarification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sales reply; everyone else (coordinator / admin / ops) posts a request.
  const direction: ClarificationDirection = userRole === 'sales_user' ? 'sales_reply' : 'coordinator_request';

  function apply(res: Awaited<ReturnType<typeof listClarifications>>) {
    setItems(res.data);
    setUnavailable(res.unavailable);
    setLoading(false);
  }
  async function reload() { apply(await listClarifications(quotationId)); }
  useEffect(() => {
    let alive = true;
    listClarifications(quotationId).then((res) => { if (alive) apply(res); });
    return () => { alive = false; };
  }, [quotationId]);

  async function send() {
    if (!body.trim()) { setError('Write a message first.'); return; }
    setSending(true); setError(null);
    const res = await addClarification({
      quotationId, direction, body, authorId: userId, authorName: userName, authorRole: userRole, file,
    });
    setSending(false);
    if (res.unavailable) { setUnavailable(true); return; }
    if (!res.ok) { setError(res.error ?? 'Could not send.'); return; }
    setBody(''); setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    void reload();
  }

  return (
    <div className="bg-white border border-gray-200/80 rounded-lg">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <MessageSquare size={15} className="text-brand-600" />
        <h3 className="text-sm font-semibold text-gray-800">Clarifications</h3>
        {items.length > 0 && <Badge variant="neutral" size="sm">{items.length}</Badge>}
      </div>

      {unavailable ? (
        <div className="px-5 py-6 flex items-start gap-2 text-sm text-amber-700">
          <Info size={15} className="shrink-0 mt-0.5" />
          Clarifications module is pending — apply migration 106 to enable the thread.
        </div>
      ) : (
        <>
          <div className="px-5 py-4 space-y-3 max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-400">No clarifications yet. Start the conversation below.</p>
            ) : (
              items.map((m) => {
                const isReply = m.direction === 'sales_reply';
                return (
                  <div key={m.id} className={`flex ${isReply ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 border ${
                      isReply ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50 border-sky-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-800">{m.author_name ?? 'User'}</span>
                        <Badge variant={isReply ? 'success' : 'info'} size="sm">
                          {isReply ? 'Sales' : 'Coordinator'}
                        </Badge>
                        <span className="text-[11px] text-gray-400">{fmt(m.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{m.body}</p>
                      {m.document_name && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-brand-600">
                          <Paperclip size={12} /> {m.document_name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 space-y-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder={direction === 'sales_reply' ? 'Reply to the coordinator…' : 'Ask the salesman for clarification…'}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                <Paperclip size={13} />
                {file ? file.name : 'Attach file'}
                <input ref={fileRef} type="file" className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <Button size="sm" loading={sending} icon={<Send size={13} />} onClick={() => void send()}>
                Send
              </Button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
