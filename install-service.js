import { Service } from 'node-windows';

  let svc = new Service({
    name: 'SELRS-Dev',
    description: 'SELRS Development Server',
    script: 'E:\\SELRS.cc\\dist\\index.js'
  });

  svc.on('install', () => {
    console.log('Service installed, starting...');
    svc.start();
  });

  svc.on('start', () => {
    console.log('Service started!');
  });

  svc.install();