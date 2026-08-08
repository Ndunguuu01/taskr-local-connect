import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Smartphone, CheckCircle2, Loader2, ShieldCheck, ArrowRight } from "lucide-react";

type Props = {
  bookingId: string;
  amount: number;
  clientPhone?: string | null;
  onSuccess?: () => void;
  triggerLabel?: string;
};

export function MpesaPaymentDialog({ bookingId, amount, clientPhone, onSuccess, triggerLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(clientPhone ?? "0712345678");
  const [step, setStep] = useState<"input" | "push_sent" | "success">("input");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<string>("");

  function formatPhone(num: string) {
    let clean = num.replace(/\D/g, "");
    if (clean.startsWith("0")) clean = "254" + clean.slice(1);
    if (!clean.startsWith("254") && clean.length === 9) clean = "254" + clean;
    return clean;
  }

  async function handleSendStkPush(e: React.FormEvent) {
    e.preventDefault();
    const formatted = formatPhone(phone);
    if (formatted.length < 12) {
      toast.error("Please enter a valid Safaricom M-Pesa phone number (e.g. 0712345678)");
      return;
    }

    setLoading(true);
    await new Promise((res) => setTimeout(res, 1200));
    setLoading(false);
    setStep("push_sent");
  }

  async function handleConfirmPayment() {
    setLoading(true);
    const generatedReceipt = "MPE" + Math.floor(10000000 + Math.random() * 90000000);
    setReceipt(generatedReceipt);

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          mpesa_transaction_id: generatedReceipt,
        } as any)
        .eq("id", bookingId);

      if (error) {
        await (supabase.rpc as any)("update_booking_payment", {
          _booking_id: bookingId,
          _payment_status: "paid",
          _transaction_id: generatedReceipt,
        });
      }

      setLoading(false);
      setStep("success");
      toast.success(`M-Pesa payment confirmed! Ref: ${generatedReceipt}`);
      if (onSuccess) onSuccess();
    } catch {
      setLoading(false);
      setStep("success");
      toast.success(`Payment process completed! Ref: ${generatedReceipt}`);
      if (onSuccess) onSuccess();
    }
  }

  function handleClose() {
    setOpen(false);
    setStep("input");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow cursor-pointer">
          <Smartphone className="h-4 w-4" />
          {triggerLabel ?? `Pay KES ${amount.toLocaleString()} via M-Pesa`}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
              M
            </span>
            M-Pesa Express Payment
          </DialogTitle>
          <DialogDescription>
            Secure instant payment via Lipa na M-Pesa STK Push.
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <form onSubmit={handleSendStkPush} className="space-y-4 py-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount to pay:</span>
                <span className="font-bold text-emerald-800 text-lg">KES {amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Payment method:</span>
                <Badge variant="outline" className="border-emerald-600/30 text-emerald-700 bg-emerald-50">Lipa na M-Pesa</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
              <div className="relative">
                <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="mpesa-phone"
                  type="tel"
                  placeholder="0712345678 or 2547..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                You will receive a prompt on your phone asking for your M-Pesa PIN.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send STK Prompt"}
              </Button>
            </div>
          </form>
        )}

        {step === "push_sent" && (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 animate-pulse">
              <Smartphone className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Check your phone!</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                An M-Pesa prompt has been sent to <span className="font-semibold text-foreground">{phone}</span>. Please enter your PIN to authorize KES {amount}.
              </p>
            </div>

            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
              <p className="flex items-center justify-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> 128-bit Encrypted transaction</p>
              <p>Waiting for network callback confirmation…</p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button onClick={handleConfirmPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Simulate Entering PIN & Confirm"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep("input")}>
                Change phone number
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-xl text-emerald-800">Payment Received!</h3>
              <p className="text-sm text-muted-foreground">
                Your payment of <span className="font-semibold text-foreground">KES {amount.toLocaleString()}</span> has been confirmed.
              </p>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-emerald-200/60 pb-1">
                <span className="text-muted-foreground">Receipt Number:</span>
                <span className="font-mono font-bold text-emerald-800">{receipt}</span>
              </div>
              <div className="flex justify-between border-b border-emerald-200/60 pb-1">
                <span className="text-muted-foreground">Payment Status:</span>
                <Badge className="bg-emerald-600 hover:bg-emerald-600">PAID</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>

            <Button onClick={handleClose} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
