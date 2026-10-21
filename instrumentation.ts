// RUN_WORKER_IN_WEB=true runs the job worker inside the web process: one Render service,
// and the embedded SurrealDB works locally because only one process opens it.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.RUN_WORKER_IN_WEB === "true") {
    const { startWorker } = await import("./worker");
    startWorker();
  }
}
