import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Smartphone, CheckCircle2, Loader2, ShieldCheck, Zap, Award } from "lucide-react";

type Props = {
  type: "urgent_job" | "worker_verification";
  amount: number;
  title: string;
  description: string;
  onSuccess: (receipt: string) => void;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
};

export function CompanyPaymentDialog({ type, amount, title, description, onSuccess, triggerLabel, triggerVariant = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("0712345678");
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
    await new Promise((res) => setTimeout(res, 1000));
    setLoading(false);
    setStep("push_sent");
  }

  async function handleConfirmPayment() {
    setLoading(true);
    const generatedReceipt = "FLX" + Math.floor(10000000 + Math.random() * 90000000);
    setReceipt(generatedReceipt);

    await new Promise((res) => setTimeout(res, 800));
    setLoading(false);
    setStep("success");
    toast.success(`M-Pesa payment of KES ${amount} successful! Ref: ${generatedReceipt}`);
    onSuccess(generatedReceipt);
  }

  function handleClose() {
    setOpen(false);
    setStep("input");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className="gap-2 cursor-pointer font-semibold shadow-sm">
          {type === "urgent_job" ? <Zap className="h-4 w-4 text-amber-500 fill-amber-500" /> : <Award className="h-4 w-4 text-emerald-600" />}
          {triggerLabel ?? `Pay KES ${amount} via M-Pesa`}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-800">
            {type === "urgent_job" ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold">⚡</span>
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold">🛡️</span>
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <form onSubmit={handleSendStkPush} className="space-y-4 py-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Company Service Fee:</span>
                <span className="font-bold text-emerald-800 text-lg">KES {amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Payment recipient:</span>
                <Badge variant="outline" className="border-emerald-600/30 text-emerald-700 bg-emerald-50">Flexworkers Platform</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comp-mpesa-phone">M-Pesa Phone Number</Label>
              <div className="relative">
                <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="comp-mpesa-phone"
                  type="tel"
                  placeholder="0712345678 or 2547..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                You will receive a Lipa na M-Pesa prompt on your phone asking for your PIN.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Pay KES ${amount} via M-Pesa`}
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
              <p className="flex items-center justify-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Instant activation upon confirmation</p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button onClick={handleConfirmPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Simulate Entering PIN & Activate"}
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
              <h3 className="font-bold text-xl text-emerald-800">Service Activated!</h3>
              <p className="text-sm text-muted-foreground">
                Payment of <span className="font-semibold text-foreground">KES {amount}</span> confirmed.
              </p>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-emerald-200/60 pb-1">
                <span className="text-muted-foreground">Receipt Ref:</span>
                <span className="font-mono font-bold text-emerald-800">{receipt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Activated:</span>
                <Badge className="bg-emerald-600">{type === "urgent_job" ? "URGENT JOB PROMOTION" : "VERIFIED PRO BADGE"}</Badge>
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
