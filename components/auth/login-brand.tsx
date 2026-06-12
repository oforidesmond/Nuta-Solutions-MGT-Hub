import Image from "next/image";

type LoginBrandProps = {
  description?: string;
};

/** Centered mark for auth surfaces - matches sidebar identity at login scale. */
export function LoginBrand({
  description = "Sign in with the email and password for your organization.",
}: LoginBrandProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/40 bg-background/80 shadow-sm">
        <Image
          src="/logo.svg"
          alt=""
          width={40}
          height={40}
          className="size-10"
          priority
          aria-hidden
        />
      </div>
      <p className="mt-5 text-xs font-medium tracking-wide text-muted-foreground">NutaPOS</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Management Hub</h1>
      <p className="mt-2 max-w-[19rem] text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
