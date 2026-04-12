import Link from "next/link";
import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add product</h1>
          <p className="text-sm text-muted-foreground">Fill in the basics. You can edit everything later.</p>
        </div>
        <Button variant="outline" size="sm" className="min-h-9" render={<Link href="/products" />}>
          Back to list
        </Button>
      </div>
      <ProductForm mode="create" />
    </div>
  );
}
