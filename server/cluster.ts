import cluster from "cluster";
import os from "os";

const workerCount = Math.max(Number(process.env.CYRUS_NODE_WORKERS || os.cpus().length), 1);

if (cluster.isPrimary) {
  console.log(`[Cluster] Primary ${process.pid} starting ${workerCount} workers`);

  for (let i = 0; i < workerCount; i += 1) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {
    console.warn(`[Cluster] Worker ${worker.process.pid} exited; restarting`);
    cluster.fork();
  });
} else {
  await import("./index");
}
