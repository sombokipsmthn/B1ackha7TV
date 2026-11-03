// 环境检测工具
export function isBrowser() {
  return typeof navigator !== 'undefined' &&
    navigator.userAgent &&
    navigator.userAgent.indexOf('Tizen') === -1;
}

export function hasWorkingMock() {
  if (typeof window === 'undefined') return false;
  const tv = window.tizen;
  return tv && tv.application && typeof tv.application.getAppsInfo === 'function';
}

export function isTizen() {
  return !isBrowser();
}

export function getDeviceInfo() {
  return {
    isBrowser: isBrowser(),
    isTizen: isTizen(),
    hasMock: hasWorkingMock(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };
}