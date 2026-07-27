"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AiSuggestedPill } from "@/components/cycle/activity-log-panel";
import {
  Camera, FileText, Upload, Sparkles, Loader2, Check, X, Plus, FileSpreadsheet, FileUp, MessageSquareText,
} from "lucide-react";
import type { ParsedEntityDraft } from "@/lib/types";

interface Field {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
  required?: boolean;
}

export function AddEntityModal() {
  const open = useAppStore((s) => s.addEntityModalOpen);
  const defaultTab = useAppStore((s) => s.addEntityDefaultTab);
  const close = useAppStore((s) => s.closeAddEntity);
  const upsertEntity = useAppStore((s) => s.upsertEntity);
  const bumpDataVersion = useAppStore((s) => s.bumpDataVersion);
  const business = useAppStore((s) => s.business);
  const { toast } = useToast();

  const [tab, setTab] = useState<"text" | "photo" | "doc" | "manual">("text");

  // Transcript state
  const [transcript, setTranscript] = useState("");
  const [parsingVoice, setParsingVoice] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<ParsedEntityDraft | null>(null);

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [parsingPhoto, setParsingPhoto] = useState(false);
  const [photoDrafts, setPhotoDrafts] = useState<ParsedEntityDraft[]>([]);
  const [excludedIdx, setExcludedIdx] = useState<Set<number>>(new Set());

  // Document state
  const [docFileName, setDocFileName] = useState<string | null>(null);
  const [parsingDoc, setParsingDoc] = useState(false);
  const [docDrafts, setDocDrafts] = useState<ParsedEntityDraft[]>([]);
  const [docExcludedIdx, setDocExcludedIdx] = useState<Set<number>>(new Set());

  // Manual state
  const [manual, setManual] = useState({
    name: "", phone: "", email: "",
    planName: business?.verticalType ? defaultPlanFor(business.verticalType) : "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    unitsTotal: "",
    amount: "",
    customFields: {} as Record<string, string>,
  });

  const fieldDefs: Field[] = business?.customFieldSchema ?? [];

  function resetAll() {
    setTranscript("");
    setVoiceDraft(null);
    setPhotoPreview(null);
    setPhotoDrafts([]);
    setExcludedIdx(new Set());
    setDocFileName(null);
    setDocDrafts([]);
    setDocExcludedIdx(new Set());
    setManual({
      name: "", phone: "", email: "",
      planName: business?.verticalType ? defaultPlanFor(business.verticalType) : "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "", unitsTotal: "", amount: "",
      customFields: {} as Record<string, string>,
    });
  }

  async function parseTextTranscript() {
    if (!transcript.trim()) return;
    setParsingVoice(true);
    try {
      const res = await fetch("/api/entities/parse-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error);
      setVoiceDraft(json.draft);
    } catch (e: any) {
      toast({ title: "Parsing failed", description: e?.message, variant: "destructive" });
    } finally {
      setParsingVoice(false);
    }
  }

  async function handlePhotoFile(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const url = reader.result as string;
      setPhotoPreview(url);
      setParsingPhoto(true);
      try {
        const res = await fetch("/api/entities/parse-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: url }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error);
        setPhotoDrafts(json.drafts ?? []);
        setExcludedIdx(new Set());
      } catch (e: any) {
        toast({ title: "OCR failed", description: e?.message, variant: "destructive" });
      } finally {
        setParsingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleDocFile(file: File) {
    setDocFileName(file.name);
    setParsingDoc(true);
    setDocDrafts([]);
    setDocExcludedIdx(new Set());

    try {
      const reader = new FileReader();
      const isText = file.type.includes("text") || file.name.endsWith(".csv") || file.name.endsWith(".txt");

      if (isText) {
        reader.onload = async () => {
          const textContent = reader.result as string;
          const res = await fetch("/api/entities/parse-doc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ textContent, fileName: file.name }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error);
          setDocDrafts(json.drafts ?? []);
        };
        reader.readAsText(file);
      } else {
        reader.onload = async () => {
          const fileBase64 = reader.result as string;
          const res = await fetch("/api/entities/parse-doc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileBase64, fileName: file.name, mimeType: file.type || "application/pdf" }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error);
          setDocDrafts(json.drafts ?? []);
        };
        reader.readAsDataURL(file);
      }
    } catch (e: any) {
      toast({ title: "Document parsing failed", description: e?.message, variant: "destructive" });
    } finally {
      setParsingDoc(false);
    }
  }

  async function saveManual() {
    if (!manual.name || !manual.planName) {
      toast({ title: "Name and plan are required", variant: "destructive" });
      return;
    }
    const res = await fetch("/api/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: manual.name,
        phone: manual.phone,
        email: manual.email || undefined,
        customFields: manual.customFields,
        cycle: {
          planName: manual.planName,
          startDate: manual.startDate,
          endDate: manual.endDate || undefined,
          unitsTotal: manual.unitsTotal ? Number(manual.unitsTotal) : undefined,
          amount: manual.amount ? Number(manual.amount) : undefined,
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: "Save failed", description: json?.error, variant: "destructive" });
      return;
    }
    upsertEntity(json.entity);
    bumpDataVersion();
    toast({ title: `${manual.name} added`, description: "Registration email/notification sent." });
    resetAll();
    close();
  }

  async function saveVoiceDraft() {
    if (!voiceDraft || !voiceDraft.name || !voiceDraft.planName) {
      toast({ title: "Name and plan are required", variant: "destructive" });
      return;
    }
    const res = await fetch("/api/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: voiceDraft.name,
        phone: voiceDraft.phone,
        email: voiceDraft.email,
        customFields: voiceDraft.customFields ?? {},
        cycle: {
          planName: voiceDraft.planName,
          startDate: voiceDraft.startDate,
          endDate: voiceDraft.endDate,
          unitsTotal: voiceDraft.unitsTotal,
          amount: voiceDraft.amount,
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: "Save failed", description: json?.error, variant: "destructive" });
      return;
    }
    upsertEntity(json.entity);
    bumpDataVersion();
    toast({ title: `${voiceDraft.name} added`, description: "Registration email/notification sent." });
    resetAll();
    close();
  }

  async function savePhotoDrafts() {
    const active = photoDrafts.filter((_, i) => !excludedIdx.has(i));
    if (active.length === 0) {
      toast({ title: "No entries selected", variant: "destructive" });
      return;
    }
    let ok = 0;
    for (const d of active) {
      const res = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: d.name,
          phone: d.phone,
          email: d.email,
          cycle: {
            planName: d.planName,
            startDate: d.startDate,
            endDate: d.endDate,
            unitsTotal: d.unitsTotal,
            amount: d.amount,
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        upsertEntity(json.entity);
        ok++;
      }
    }
    bumpDataVersion();
    toast({ title: `Imported ${ok} ${business?.entityLabel.toLowerCase() ?? "entries"}s`, description: "Registration notifications sent." });
    setPhotoDrafts([]);
    setPhotoPreview(null);
    setExcludedIdx(new Set());
    close();
  }

  async function saveDocDrafts() {
    const active = docDrafts.filter((_, i) => !docExcludedIdx.has(i));
    if (active.length === 0) {
      toast({ title: "No entries selected", variant: "destructive" });
      return;
    }
    let ok = 0;
    for (const d of active) {
      const res = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: d.name,
          phone: d.phone,
          email: d.email,
          cycle: {
            planName: d.planName || "Standard Plan",
            startDate: d.startDate || new Date().toISOString().slice(0, 10),
            endDate: d.endDate,
            unitsTotal: d.unitsTotal,
            amount: d.amount,
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        upsertEntity(json.entity);
        ok++;
      }
    }
    bumpDataVersion();
    toast({ title: `Imported ${ok} records from ${docFileName || "file"}`, description: "Registration notifications sent." });
    setDocDrafts([]);
    setDocFileName(null);
    setDocExcludedIdx(new Set());
    close();
  }

  function onOpenChange(o: boolean) {
    if (!o) {
      resetAll();
      close();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-xl text-[var(--ink)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-[var(--brand)]" />
            Add {business?.entityLabel ?? "entity"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 text-xs sm:text-sm">
            <TabsTrigger value="text" className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> AI Parse
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex items-center gap-1">
              <Camera className="h-3.5 w-3.5" /> Photo OCR
            </TabsTrigger>
            <TabsTrigger value="doc" className="flex items-center gap-1">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Doc / Sheet
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Manual
            </TabsTrigger>
          </TabsList>

          {/* AI TEXT PARSE TAB */}
          <TabsContent value="text" className="space-y-4 mt-4">
            <p className="caption text-[var(--ink-mute)]">
              Paste or type any client entry details (e.g., &quot;Ramesh Kumar, 3-month membership, ₹1500, starts today&quot;). Gemini AI will extract all structured fields for your confirmation.
            </p>

            {!voiceDraft && (
              <div className="rounded-md border border-[var(--hairline)] bg-[var(--canvas-soft)] p-4 space-y-3">
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste or type details: e.g. Rahul Sharma, 6 month gym membership, phone 9876543210, 1500 INR..."
                  className="text-sm border-[var(--hairline)] focus:border-[var(--brand)] bg-[var(--canvas)]"
                  rows={4}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={parseTextTranscript}
                    disabled={!transcript.trim() || parsingVoice}
                    className="bg-[var(--brand)] text-[var(--on-primary)] hover:bg-[var(--brand-deep)] font-medium text-xs sm:text-sm"
                    size="sm"
                  >
                    {parsingVoice ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Extracting with Gemini AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Parse text with AI
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {voiceDraft && (
              <div className="rounded-lg border border-[var(--hairline)] bg-[var(--canvas-soft)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                    <span className="font-medium text-sm">AI Extracted Draft</span>
                  </div>
                  <AiSuggestedPill />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="caption text-[var(--ink-mute)]">Name</Label>
                    <Input
                      value={voiceDraft.name}
                      onChange={(e) => setVoiceDraft({ ...voiceDraft, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="caption text-[var(--ink-mute)]">Phone</Label>
                    <Input
                      value={voiceDraft.phone ?? ""}
                      onChange={(e) => setVoiceDraft({ ...voiceDraft, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="caption text-[var(--ink-mute)]">Plan Name</Label>
                    <Input
                      value={voiceDraft.planName}
                      onChange={(e) => setVoiceDraft({ ...voiceDraft, planName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="caption text-[var(--ink-mute)]">Start Date</Label>
                    <Input
                      type="date"
                      value={voiceDraft.startDate}
                      onChange={(e) => setVoiceDraft({ ...voiceDraft, startDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setVoiceDraft(null)}>
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[var(--brand)] text-[var(--on-primary)] hover:bg-[var(--brand-deep)]"
                    onClick={saveVoiceDraft}
                  >
                    <Check className="h-4 w-4 mr-1" /> Confirm & Save
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* PHOTO TAB */}
          <TabsContent value="photo" className="space-y-4 mt-4">
            <p className="caption text-[var(--ink-mute)]">
              Upload a photo of a physical register or handwritten ledger. Multimodal Gemini OCR will extract rows.
            </p>

            {!photoPreview && (
              <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--hairline-strong)] bg-[var(--canvas-soft)] p-8 text-center cursor-pointer hover:border-[var(--brand)]">
                <Camera className="h-8 w-8 text-[var(--ink-mute)] mb-2" />
                <span className="text-sm font-medium">Upload photo of register</span>
                <span className="caption text-[var(--ink-mute)]">JPG, PNG, WebP</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoFile(f);
                  }}
                />
              </label>
            )}

            {photoPreview && (
              <div className="flex flex-col md:flex-row gap-4">
                <img
                  src={photoPreview}
                  alt="Register upload preview"
                  className="max-h-56 md:w-1/3 rounded-md border border-[var(--hairline)] object-contain"
                />
                <div className="flex-1">
                  {parsingPhoto ? (
                    <div className="flex items-center gap-2 text-sm text-[var(--ink-mute)] py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--brand)]" /> Reading register photo with Gemini...
                    </div>
                  ) : photoDrafts.length === 0 ? (
                    <p className="caption text-[var(--ink-mute)]">No rows detected. Try a clearer photo or use Manual.</p>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      <p className="caption text-[var(--ink-mute)] mb-2">
                        Detected {photoDrafts.length} row(s). Review and uncheck any misread entries before saving.
                      </p>
                      {photoDrafts.map((d, i) => (
                        <div
                          key={i}
                          className={
                            "rounded-md border p-2.5 text-sm " +
                            (excludedIdx.has(i)
                              ? "border-[var(--hairline)] opacity-50 bg-[var(--canvas-soft)]"
                              : "border-[var(--hairline)] bg-[var(--canvas)]")
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="checkbox"
                              checked={!excludedIdx.has(i)}
                              onChange={(e) => {
                                const next = new Set(excludedIdx);
                                if (e.target.checked) next.delete(i);
                                else next.add(i);
                                setExcludedIdx(next);
                              }}
                            />
                            <div className="flex-1">
                              <input
                                value={d.name}
                                onChange={(e) => {
                                  const next = [...photoDrafts];
                                  next[i] = { ...d, name: e.target.value };
                                  setPhotoDrafts(next);
                                }}
                                className="w-full bg-transparent font-medium outline-none"
                              />
                              <div className="caption text-[var(--ink-mute)]">
                                {d.phone || "No phone"} · {d.planName} · {d.startDate}
                              </div>
                            </div>
                            <AiSuggestedPill />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {photoDrafts.length > 0 && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setPhotoDrafts([]); setPhotoPreview(null); }}>
                  Discard
                </Button>
                <Button
                  size="sm"
                  className="bg-[var(--brand)] text-[var(--on-primary)] hover:bg-[var(--brand-deep)]"
                  onClick={savePhotoDrafts}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Import {photoDrafts.filter((_, i) => !excludedIdx.has(i)).length} entries
                </Button>
              </div>
            )}
          </TabsContent>

          {/* DOCUMENT / SPREADSHEET TAB */}
          <TabsContent value="doc" className="space-y-4 mt-4">
            <p className="caption text-[var(--ink-mute)]">
              Already have a database in PDF, Excel (.xlsx), CSV, Word (.docx), or Text format?
              Upload it here and Gemini 2.5 Flash will extract all client records automatically.
            </p>

            {!docFileName && (
              <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--hairline-strong)] bg-[var(--canvas-soft)] p-8 text-center cursor-pointer hover:border-[var(--brand)]">
                <FileUp className="h-8 w-8 text-[var(--ink-mute)] mb-2" />
                <span className="text-sm font-medium">Upload PDF, Excel, CSV, Word, or Text file</span>
                <span className="caption text-[var(--ink-mute)]">.pdf, .xlsx, .xls, .csv, .docx, .txt</span>
                <input
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleDocFile(f);
                  }}
                />
              </label>
            )}

            {docFileName && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-md border border-[var(--hairline)] bg-[var(--canvas-soft)] px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-[var(--brand)]" />
                    <span className="font-medium truncate max-w-xs">{docFileName}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setDocFileName(null); setDocDrafts([]); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {parsingDoc ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--ink-mute)] py-6 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--brand)]" /> Extracting database records with Gemini AI...
                  </div>
                ) : docDrafts.length === 0 ? (
                  <p className="caption text-[var(--ink-mute)] text-center py-4">
                    No client records detected in file. Try uploading another document or CSV.
                  </p>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    <p className="caption text-[var(--ink-mute)] mb-2">
                      Extracted {docDrafts.length} client record(s). Review and uncheck any unwanted rows before importing.
                    </p>
                    {docDrafts.map((d, i) => (
                      <div
                        key={i}
                        className={
                          "rounded-md border p-2.5 text-sm " +
                          (docExcludedIdx.has(i)
                            ? "border-[var(--hairline)] opacity-50 bg-[var(--canvas-soft)]"
                            : "border-[var(--hairline)] bg-[var(--canvas)]")
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="checkbox"
                            checked={!docExcludedIdx.has(i)}
                            onChange={(e) => {
                              const next = new Set(docExcludedIdx);
                              if (e.target.checked) next.delete(i);
                              else next.add(i);
                              setDocExcludedIdx(next);
                            }}
                          />
                          <div className="flex-1">
                            <input
                              value={d.name}
                              onChange={(e) => {
                                const next = [...docDrafts];
                                next[i] = { ...d, name: e.target.value };
                                setDocDrafts(next);
                              }}
                              className="w-full bg-transparent font-medium outline-none"
                            />
                            <div className="caption text-[var(--ink-mute)]">
                              {d.phone || "No phone"} · {d.email || "No email"} · {d.planName}
                            </div>
                          </div>
                          <AiSuggestedPill />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {docDrafts.length > 0 && (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => { setDocDrafts([]); setDocFileName(null); }}>
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[var(--brand)] text-[var(--on-primary)] hover:bg-[var(--brand-deep)]"
                      onClick={saveDocDrafts}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Import {docDrafts.filter((_, i) => !docExcludedIdx.has(i)).length} records
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* MANUAL TAB */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <p className="caption text-[var(--ink-mute)]">
              Manual entry form. Custom fields below are automatically configured from your vertical setup.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="caption text-[var(--ink-mute)]">Name *</Label>
                <Input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
              </div>
              <div>
                <Label className="caption text-[var(--ink-mute)]">Phone *</Label>
                <Input value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} />
              </div>
              <div>
                <Label className="caption text-[var(--ink-mute)]">Email</Label>
                <Input value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} />
              </div>
              <div>
                <Label className="caption text-[var(--ink-mute)]">Plan Name *</Label>
                <Input value={manual.planName} onChange={(e) => setManual({ ...manual, planName: e.target.value })} />
              </div>
              <div>
                <Label className="caption text-[var(--ink-mute)]">Start Date *</Label>
                <Input
                  type="date"
                  value={manual.startDate}
                  onChange={(e) => setManual({ ...manual, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label className="caption text-[var(--ink-mute)]">End Date</Label>
                <Input
                  type="date"
                  value={manual.endDate}
                  onChange={(e) => setManual({ ...manual, endDate: e.target.value })}
                />
              </div>
            </div>

            {fieldDefs.length > 0 && (
              <div className="pt-2">
                <p className="caption mb-2 text-[var(--ink-mute)]">Custom Fields ({business?.verticalType})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fieldDefs.map((f) => (
                    <div key={f.key}>
                      <Label className="caption text-[var(--ink-mute)]">{f.label}</Label>
                      <Input
                        value={manual.customFields[f.key] ?? ""}
                        onChange={(e) =>
                          setManual({
                            ...manual,
                            customFields: { ...manual.customFields, [f.key]: e.target.value },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--hairline)]">
              <Button variant="outline" size="sm" onClick={close}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[var(--brand)] text-[var(--on-primary)] hover:bg-[var(--brand-deep)] font-medium"
                onClick={saveManual}
              >
                Save {business?.entityLabel.toLowerCase()}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function defaultPlanFor(vertical: string): string {
  switch (vertical) {
    case "gym": return "3-month membership";
    case "tuition": return "Monthly tuition";
    case "salon": return "10-session package";
    case "pet_daycare": return "Daycare pass";
    case "amc": return "Annual maintenance";
    case "rental": return "Monthly lease";
    default: return "Standard plan";
  }
}
