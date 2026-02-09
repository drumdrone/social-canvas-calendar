import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PostPdfPreview } from './PostPdfPreview';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const generatePdf = async (): Promise<string> => {
    if (!previewRef.current) throw new Error('Preview not ready');

    const canvas = await html2canvas(previewRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageHeight = pdf.internal.pageSize.getHeight();
    const xOffset = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
    const yOffset = Math.max(10, (pageHeight - imgHeight) / 2);

    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      xOffset,
      yOffset,
      imgWidth,
      Math.min(imgHeight, pageHeight - 20)
    );

    return pdf.output('datauristring');
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (!previewRef.current) throw new Error('Preview not ready');

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = pdf.internal.pageSize.getHeight();
      const xOffset = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
      const yOffset = Math.max(10, (pageHeight - imgHeight) / 2);

      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        xOffset,
        yOffset,
        imgWidth,
        Math.min(imgHeight, pageHeight - 20)
      );

      pdf.save(`post-${post.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`);

      toast({
        title: 'PDF stazeno',
        description: 'PDF soubor byl ulozen.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo se vygenerovat PDF.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleSend = async () => {
    if (!email.trim()) {
      toast({
        title: 'Chyba',
        description: 'Zadejte emailovou adresu.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const pdfDataUri = await generatePdf();
      // Extract base64 from data URI: "data:application/pdf;base64,..."
      const pdfBase64 = pdfDataUri.split(',')[1];

      const { data, error } = await supabase.functions.invoke('send-post-pdf', {
        body: {
          email: email.trim(),
          pdfBase64,
          postTitle: post.title,
          postContent: post.content,
          postPlatform: post.platform,
          postAuthor: post.author,
          postDate: post.scheduledDate,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Email odeslan',
        description: `PDF bylo odeslano na ${email.trim()}`,
      });

      setEmail('');
      onClose();
    } catch (error: any) {
      console.error('Error sending PDF:', error);
      toast({
        title: 'Chyba pri odesilani',
        description: error.message || 'Nepodarilo se odeslat email. Zkuste stahnout PDF.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Odeslat post jako PDF</DialogTitle>
        </DialogHeader>

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="pdf-email">Emailova adresa</Label>
          <Input
            id="pdf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !sending) handleSend();
            }}
          />
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-4 bg-gray-50 overflow-auto">
          <Label className="text-xs text-muted-foreground mb-2 block">Nahled PDF</Label>
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
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={downloading || sending}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Stahnout PDF
          </Button>
          <Button
            onClick={handleSend}
            disabled={!email.trim() || sending || downloading}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Odeslat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
