interface Window {
  hideGamesDesktop?: {
    hideWindow: () => Promise<void>
    showWindow: () => Promise<void>
    setBrightness: (value: number, restore?: boolean) => Promise<{ supported: boolean; message?: string }>
    setAwayShortcut: (accelerator: string) => Promise<{ ok: boolean; message?: string; accelerator?: string }>
    onAwayStarted: (callback: () => void) => () => void
    onAwayReturned: (callback: () => void) => () => void
    onRoomLink: (callback: (code: string) => void) => () => void
  }
}
