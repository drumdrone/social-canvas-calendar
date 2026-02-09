import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Download, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PostPdfPreview } from './PostPdfPreview';
import html2canvas from 'html2canvas';

const STORAGE_KEY = 'social-canvas-preset-emails';

function loadPresetEmails(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePresetEmails(emails: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
}

interface SendPostPdfDialogProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    title: string;
    content: string;
    platform: string;
    author: string;
    scheduledDate: string;
    images: (string | null)[];
    category?: string;
    pillar?: string;
    status?: string;
  };
}

export const SendPostPdfDialog: React.FC<SendPostPdfDialogProps> = ({
  isOpen,
  onClose,
  post,
}) => {
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [presetEmails, setPresetEmails] = useState<string[]>([]);
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [newPresetEmail, setNewPresetEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setPresetEmails(loadPresetEmails());
    }
  }, [isOpen]);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const addEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && isValidEmail(trimmed) && !selectedEmails.includes(trimmed)) {
      setSelectedEmails(prev => [...prev, trimmed]);
    }
    setEmailInput('');
  };

  const removeEmail = (email: string) => {
    setSelectedEmails(prev => prev.filter(e => e !== email));
  };

  const togglePresetEmail = (email: string) => {
    if (selectedEmails.includes(email)) {
      removeEmail(email);
    } else {
      setSelectedEmails(prev => [...prev, email]);
    }
  };

  const addPresetEmail = () => {
    const trimmed = newPresetEmail.trim().toLowerCase();
    if (trimmed && isValidEmail(trimmed) && !presetEmails.includes(trimmed)) {
      const updated = [...presetEmails, trimmed];
      setPresetEmails(updated);
      savePresetEmails(updated);
      setNewPresetEmail('');
      setShowAddPreset(false);
    }
  };

  const removePresetEmail = (email: string) => {
    const updated = presetEmails.filter(e => e !== email);
    setPresetEmails(updated);
    savePresetEmails(updated);
    setSelectedEmails(prev => prev.filter(e => e !== email));
  };

  const captureScreenshot = async (): Promise<string> => {
    if (!previewRef.current) throw new Error('Preview not ready');
    const canvas = await html2canvas(previewRef.current, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });
    // Use JPEG for smaller payload (PNG base64 can be 2MB+)
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const dataUrl = await captureScreenshot();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `post-${post.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.jpg`;
      a.click();

      toast({ title: 'Obrazek stazen', description: 'PNG soubor byl ulozen.' });
    } catch (error) {
      console.error('Error generating image:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo se vygenerovat obrazek.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleSend = async () => {
    if (selectedEmails.length === 0) {
      toast({ title: 'Chyba', description: 'Vyberte alespon jeden email.', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const dataUrl = await captureScreenshot();
      const screenshotBase64 = dataUrl.split(',')[1];

      // Get app URL for link to post
      const appUrl = window.location.origin;

      const { data, error } = await supabase.functions.invoke('send-post-pdf', {
        body: {
          emails: selectedEmails,
          screenshotBase64,
          postTitle: post.title,
          appUrl,
        },
      });

      // Edge function now always returns 200, check for error in body
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.success) throw new Error('Neocekavana odpoved ze serveru');

      toast({
        title: 'Email odeslan',
        description: `PDF odeslano na ${selectedEmails.length} ${selectedEmails.length === 1 ? 'adresu' : selectedEmails.length < 5 ? 'adresy' : 'adres'}`,
      });

      // Auto-save any new emails to presets
      const newPresets = [...presetEmails];
      selectedEmails.forEach(email => {
        if (!newPresets.includes(email)) newPresets.push(email);
      });
      if (newPresets.length !== presetEmails.length) {
        setPresetEmails(newPresets);
        savePresetEmails(newPresets);
      }

      setSelectedEmails([]);
      onClose();
    } catch (error: any) {
      console.error('Error sending PDF:', error);

      const msg = error.message || '';
      const isEdgeFunctionError =
        msg.includes('Edge Function') ||
        msg.includes('FunctionsHttpError') ||
        msg.includes('FunctionsRelayError') ||
        msg.includes('Failed to send');

      if (isEdgeFunctionError) {
        toast({
          title: 'Edge function neni dostupna',
          description: 'PDF bude stazeno. Pro odesilani emailem nasadte: supabase functions deploy send-post-pdf',
          variant: 'destructive',
        });
        await handleDownload();
      } else {
        toast({
          title: 'Chyba pri odesilani',
          description: msg || 'Nepodarilo se odeslat email.',
          variant: 'destructive',
        });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Odeslat post</DialogTitle>
        </DialogHeader>

        {/* Preset Emails */}
        {presetEmails.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Ulozene emaily (kliknete pro vyber)</Label>
            <div className="flex flex-wrap gap-2">
              {presetEmails.map(email => (
                <div key={email} className="flex items-center gap-0.5">
                  <Button
                    variant={selectedEmails.includes(email) ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => togglePresetEmail(email)}
                  >
                    {email}
                  </Button>
                  <button
                    onClick={() => removePresetEmail(email)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                    title="Odebrat z ulozenych"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add preset */}
        <div>
          {showAddPreset ? (
            <div className="flex gap-2">
              <Input
                value={newPresetEmail}
                onChange={e => setNewPresetEmail(e.target.value)}
                placeholder="novy@email.cz"
                className="h-8 text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter') addPresetEmail();
                  if (e.key === 'Escape') setShowAddPreset(false);
                }}
                autoFocus
              />
              <Button size="sm" className="h-8" onClick={addPresetEmail} disabled={!isValidEmail(newPresetEmail.trim())}>
                Ulozit
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => { setShowAddPreset(false); setNewPresetEmail(''); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground gap-1"
              onClick={() => setShowAddPreset(true)}
            >
              <Plus className="h-3 w-3" />
              Pridat predvoleny email
            </Button>
          )}
        </div>

        {/* Manual email input */}
        <div className="space-y-2">
          <Label htmlFor="pdf-email" className="text-xs text-muted-foreground">Nebo zadejte email rucne</Label>
          <div className="flex gap-2">
            <Input
              id="pdf-email"
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="dalsi@email.cz + Enter"
              className="h-8 text-sm"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addEmail(emailInput);
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => addEmail(emailInput)}
              disabled={!isValidEmail(emailInput.trim())}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Selected emails summary */}
        {selectedEmails.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Odeslat na ({selectedEmails.length}):</Label>
            <div className="flex flex-wrap gap-1">
              {selectedEmails.map(email => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full"
                >
                  {email}
                  <button onClick={() => removeEmail(email)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="border rounded-lg p-4 bg-gray-50 overflow-auto">
          <Label className="text-xs text-muted-foreground mb-2 block">Nahled</Label>
          <div style={{ transform: 'scale(0.85)', transformOrigin: 'top left', width: '117.6%' }}>
            <PostPdfPreview
              ref={previewRef}
              title={post.title}
              content={post.content}
              platform={post.platform}
              author={post.author}
              scheduledDate={post.scheduledDate}
              images={post.images}
              category={post.category}
              pillar={post.pillar}
              status={post.status}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDownload} disabled={downloading || sending}>
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Stahnout obrazek
          </Button>
          <Button onClick={handleSend} disabled={selectedEmails.length === 0 || sending || downloading}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Odeslat ({selectedEmails.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
