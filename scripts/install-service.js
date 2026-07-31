const Service = require("node-windows").Service;

let svc = new Service({
  name: "SELRS-Dev",
  description: "SELRS Development Server",
  script: "E:\\selrs.cc\\dist\\index.js",
});

svc.on("install", () => {
  console.log("Service installed, starting...");
  svc.start();
});

svc.on("start", () => {
  console.log("Service started!");
});

svc.install();
