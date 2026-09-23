import React, { useMemo, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CampaignLights, CampaignLightPost, isPublishedStatus } from '@/components/campaigns/CampaignLights';
import { ExternalLink, Link2, Loader2, Megaphone, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type PostsByProduct = Record<string, CampaignLightPost[]>;

// ---------------------------------------------------------------------------
// Add-product row: paste an e-shop URL and load code + name, or type them in.

const AddProductForm: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const fetchProduct = useAction(api.campaigns.fetchProductFromUrl);
  const addProduct = useMutation(api.campaigns.addProduct);
  const [url, setUrl] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [target, setTarget] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleLoad = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetchProduct({ url: url.trim() });
      if (res.code) setCode(res.code);
      if (res.name) setName(res.name);
      setImageUrl(res.imageUrl ?? null);
      setUrl(res.url);
      if (!res.code || !res.name) {
        toast.warning('Něco se nepodařilo načíst — doplňte prosím ručně');
      } else {
        toast.success('Produkt načten z e-shopu');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Načtení se nepovedlo: ${e?.message ?? 'neznámá chyba'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error('Vyplňte kód i název výrobku');
      return;
    }
    try {
      await addProduct({
        campaignId: campaignId as Id<'campaigns'>,
        code: code.trim(),
        name: name.trim(),
        url: url.trim() || null,
        imageUrl,
        targetPosts: Math.max(1, target || 1),
        orderIndex: Date.now(),
      });
      setUrl('');
      setCode('');
      setName('');
      setImageUrl(null);
      setTarget(1);
    } catch (e) {
      console.error(e);
      toast.error('Výrobek se nepodařilo přidat');
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-dashed p-3 space-y-3 bg-muted/20">
      <div className="text-sm font-medium">Přidat výrobek</div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="URL výrobku v e-shopu (volitelné)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={handleLoad} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          <span className="ml-2">Načíst z e-shopu</span>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr_120px_auto] gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Kód výrobku</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Název</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Počet FB postů</Label>
          <Input
            type="number"
            min={1}
            value={target}
            onChange={(e) => setTarget(parseInt(e.target.value) || 1)}
          />
        </div>
        <Button type="button" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" /> Přidat
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

const TargetInput: React.FC<{ productId: string; value: number }> = ({ productId, value }) => {
  const updateProduct = useMutation(api.campaigns.updateProduct);
  const [draft, setDraft] = useState(String(value));
  React.useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Math.max(1, parseInt(draft) || 1);
    setDraft(String(n));
    if (n !== value) {
      updateProduct({ id: productId as Id<'campaignProducts'>, patch: { targetPosts: n } }).catch(() =>
        toast.error('Uložení se nepovedlo'),
      );
    }
  };
  return (
    <Input
      type="number"
      min={1}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="h-8 w-20"
    />
  );
};

const CampaignCard: React.FC<{
  campaign: any;
  products: any[];
  postsByProduct: PostsByProduct;
  onDelete: () => void;
}> = ({ campaign, products, postsByProduct, onDelete }) => {
  const removeProduct = useMutation(api.campaigns.removeProduct);

  const totals = products.reduce(
    (acc, p) => {
      const posts = postsByProduct[p._id] ?? [];
      acc.target += p.targetPosts;
      acc.done += Math.min(posts.filter(x => isPublishedStatus(x.status)).length, p.targetPosts);
      return acc;
    },
    { target: 0, done: 0 },
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div>
          <h2 className="text-xl font-semibold">{campaign.name}</h2>
          <p className="text-sm text-muted-foreground">
            {campaign.startDate || campaign.endDate
              ? `${campaign.startDate ?? '…'} – ${campaign.endDate ?? '…'} · `
              : ''}
            zveřejněno {totals.done} z {totals.target} postů
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} title="Smazat kampaň">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent>
        {products.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-36">Kód výrobku</TableHead>
                <TableHead>Název</TableHead>
                <TableHead className="w-28">Počet FB postů</TableHead>
                <TableHead>Semafor</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const posts = postsByProduct[p._id] ?? [];
                return (
                  <TableRow key={p._id}>
                    <TableCell>
                      {p.imageUrl && (
                        <img src={p.imageUrl} alt="" className="h-9 w-9 rounded object-cover" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{p.code}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        {p.name}
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TargetInput productId={p._id} value={p.targetPosts} />
                    </TableCell>
                    <TableCell>
                      <CampaignLights posts={posts} target={p.targetPosts} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Odebrat výrobek"
                        onClick={() => {
                          if (!window.confirm(`Odebrat výrobek „${p.name}“ z kampaně?`)) return;
                          removeProduct({ id: p._id }).catch(() => toast.error('Odebrání se nepovedlo'));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Kampaň zatím nemá žádné výrobky.</p>
        )}
        <AddProductForm campaignId={campaign._id} />
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------

const Campaigns = () => {
  const campaignsQ = useQuery(api.campaigns.list);
  const productsQ = useQuery(api.campaigns.listProducts);
  const postsQ = useQuery(api.posts.list);
  const createCampaign = useMutation(api.campaigns.create);
  const removeCampaign = useMutation(api.campaigns.remove);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);

  const postsByProduct = useMemo<PostsByProduct>(() => {
    const map: PostsByProduct = {};
    for (const p of postsQ ?? []) {
      const pid = (p as any).campaignProductId;
      if (!pid) continue;
      (map[pid] ??= []).push({
        title: (p as any).title ?? '',
        status: (p as any).status ?? '',
        scheduledDate: (p as any).scheduledDate,
      });
    }
    return map;
  }, [postsQ]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Zadejte název kampaně');
      return;
    }
    try {
      await createCampaign({
        name: name.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
      });
      setName('');
      setStartDate('');
      setEndDate('');
      toast.success('Kampaň založena');
    } catch (e) {
      console.error(e);
      toast.error('Kampaň se nepodařilo založit');
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col bg-background">
        <div className="p-6 border-b">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Megaphone className="h-7 w-7" /> Kampaně
          </h1>
          <p className="text-muted-foreground mt-1">
            Výrobky v kampani a kolik postů na každý chceme. Semafor: 🟢 zveřejněno · 🟠 naplánováno · 🔴 chybí.
          </p>
        </div>

        <div className="p-6 space-y-6 max-w-6xl w-full">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_160px_auto] gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Název nové kampaně</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="např. Podzimní čaje"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Od</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Do</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-1" /> Založit kampaň
                </Button>
              </div>
            </CardContent>
          </Card>

          {campaignsQ === undefined ? (
            <p className="text-muted-foreground">Načítám…</p>
          ) : campaignsQ.length === 0 ? (
            <p className="text-muted-foreground">Zatím tu není žádná kampaň.</p>
          ) : (
            campaignsQ.map((c: any) => (
              <CampaignCard
                key={c._id}
                campaign={c}
                products={(productsQ ?? []).filter((p: any) => p.campaignId === c._id)}
                postsByProduct={postsByProduct}
                onDelete={() => setPendingDelete(c)}
              />
            ))
          )}
        </div>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat kampaň „{pendingDelete?.name}“?</AlertDialogTitle>
            <AlertDialogDescription>
              Smažou se i její výrobky. Posty zůstanou, jen se od výrobků odpojí.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) {
                  removeCampaign({ id: pendingDelete._id }).catch(() => toast.error('Smazání se nepovedlo'));
                }
                setPendingDelete(null);
              }}
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Campaigns;
