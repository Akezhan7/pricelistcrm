module.exports = {
  apps: [
    {
      name: 'plastkrep-crm',
      script: 'index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      restart_delay: 2000,
      kill_timeout: 10000,
      time: true,
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
