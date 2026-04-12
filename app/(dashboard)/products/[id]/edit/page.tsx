import Link from "next/link";
import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit product</h1>
          <p className="text-sm text-muted-foreground">Update details and save when you are done.</p>
        </div>
        <Button variant="outline" size="sm" className="min-h-9" render={<Link href={`/products/${id}`} />}>
          View details
        </Button>
      </div>
      <ProductForm mode="edit" productId={id} />
    </div>
  );
}
