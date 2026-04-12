"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "@/lib/api/categories";
import { handleApiError } from "@/lib/api/errors";
import type { HubCategory } from "@/lib/types/domain";

export default function CategoriesPage() {
  const [rows, setRows] = useState<HubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HubCategory | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [blockOpen, setBlockOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCategories();
      setRows(data);
    } catch (e) {
      toast.error(handleApiError(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setName("");
    setDescription("");
    setOpen(true);
  }

  function openEdit(c: HubCategory) {
    setEditing(c);
    setName(c.name);
    setDescription(c.description ?? "");
    setOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, { name: name.trim(), description: description.trim() || undefined });
        toast.success("Category updated");
      } else {
        await createCategory({ name: name.trim(), description: description.trim() || undefined });
        toast.success("Category added");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(c: HubCategory) {
    try {
      await deleteCategory(c.id);
      toast.success("Category removed");
      await load();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setBlockOpen(
          `Cannot delete “${c.name}” while products still use it. Move or delete those products first.`,
        );
        return;
      }
      toast.error(handleApiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">Group your products so staff can find them faster.</p>
        </div>
        <Button type="button" className="min-h-9 shrink-0" onClick={openNew}>
          <Plus className="size-4" aria-hidden />
          New category
        </Button>
      </div>

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Your categories</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories yet. Add one to organize your catalog.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {rows.map((c) => (
                <li key={c.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {typeof c.productCount === "number" ? `${c.productCount} products` : " "}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={() => openEdit(c)}>
                      Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="min-h-9" render={<Link href={`/products?categoryId=${encodeURIComponent(c.id)}`} />}>
                      View products
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="min-h-9 text-destructive" onClick={() => void onDelete(c)}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border/40 bg-card/95 backdrop-blur-md sm:max-w-md">
          <form onSubmit={onSave}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Category name *</Label>
                <Input id="cat-name" className="min-h-11" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description (optional)</Label>
                <Textarea id="cat-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!blockOpen} onOpenChange={(o) => !o && setBlockOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cannot delete this category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{blockOpen}</p>
          <DialogFooter>
            <Button type="button" onClick={() => setBlockOpen(null)}>
              OK, got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
