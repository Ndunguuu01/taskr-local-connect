import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { toast } from "sonner";

type Message = { id: string; booking_id: string; sender_id: string; content: string; sent_at: string; read_at: string | null };

export function ChatPanel({ bookingId, currentUserId }: { bookingId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase
        .from("messages")
        .select("id,booking_id,sender_id,content,sent_at,read_at")
        .eq("booking_id", bookingId)
        .order("sent_at", { ascending: true });
      if (mounted) setMessages((data ?? []) as Message[]);
      await (supabase.rpc as any)("mark_messages_read", { _booking_id: bookingId });
    }
    load();
    const channel = supabase
      .channel(`chat-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          if ((payload.new as Message).sender_id !== currentUserId) {
            (supabase.rpc as any)("mark_messages_read", { _booking_id: bookingId });
          }
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [bookingId, currentUserId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    const { error } = await (supabase.rpc as any)("send_message", { _booking_id: bookingId, _content: content });
    setSending(false);
    if (error) return toast.error(error.message);
    setText("");
  }

  return (
    <div className="flex h-[420px] flex-col rounded-lg border border-border">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No messages yet — say hello.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" />
        <Button type="submit" size="icon" disabled={sending || !text.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
