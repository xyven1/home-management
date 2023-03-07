module.exports = {
  apps : [{
    name: 'home-management',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      SERVER_PORT: 43434,
    }
  }],
}
