/** Socket.IO disconnect reasons that often indicate expired/invalid JWT. */
export function isAuthRelatedDisconnect(reason: string): boolean {
  return (
    reason === "io server disconnect" ||
    reason === "parse error" ||
    reason === "forced close"
  );
}

export function isAuthConnectError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes("unauthorized") ||
    msg.includes("jwt") ||
    msg.includes("auth") ||
    msg.includes("token") ||
    msg.includes("forbidden")
  );
}
