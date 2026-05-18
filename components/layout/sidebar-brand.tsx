import Image from "next/image";

type SidebarBrandProps = {
  title: string;
  productLine?: string;
};

/** Sidebar header mark — logo + typographic stack (Apple-style, deference to nav). */
export function SidebarBrand({ productLine = "NutaPOS", title }: SidebarBrandProps) {
  return (
    <div className="mb-4 flex items-center gap-3 px-2 pt-1">
      <Image
        src="/logo.svg"
        alt=""
        width={28}
        height={28}
        className="size-7 shrink-0"
        priority
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">{productLine}</p>
        <p className="truncate text-sm font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </p>
      </div>
    </div>
  );
}
