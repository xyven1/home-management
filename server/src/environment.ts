export const dataPath =
  process.platform === "win32"
    ? "C:/ProgramData/home-management/"
    : "/var/cache/home-management/";
export const configPath =
  process.platform === "win32"
    ? "C:/Program Files/home-management/"
    : "/etc/home-management/";
