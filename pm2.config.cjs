module.exports = {
  apps : [{
    name: 'home-management',
    script: 'npm',
    args: "--prefix server run start",
    env: {
      "NODE_ENV": "production",
    }
  }],
}