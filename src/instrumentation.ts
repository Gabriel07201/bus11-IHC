export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { initializeApplication } = await import("./lib/startup");
  await initializeApplication();
}
