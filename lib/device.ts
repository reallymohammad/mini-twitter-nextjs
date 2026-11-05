export function parseDevice(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";

  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);

  let os = "Unknown OS";
  if (/Windows NT 10/i.test(ua)) os = "Windows 10/11";
  else if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Unknown browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/OPR\//i.test(ua)) browser = "Opera";

  const deviceType = isMobile ? "Mobile" : "Desktop";

  return `${browser} on ${os} (${deviceType})`;
}
