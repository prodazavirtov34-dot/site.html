// Synchronization service between Streamer Control Panel and OBS Overlay
// Uses BroadcastChannel + fallback to localStorage storage events

class SyncService {
  constructor() {
    this.channel = null;
    this.listeners = new Set();

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('twitch_roulette_sync');
        this.channel.onmessage = (event) => {
          this.notify(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel failed, using storage fallback', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === '__twitch_wheel_sync_event' && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            this.notify(data);
          } catch {}
        }
      });
    }
  }

  send(type, payload = {}) {
    const message = { type, payload, timestamp: Date.now() };

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch {}
    }

    // Also write to localStorage for cross-context redundancy (e.g. OBS CEF browser)
    try {
      localStorage.setItem('__twitch_wheel_sync_event', JSON.stringify(message));
    } catch {}
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(data) {
    this.listeners.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error('Sync listener error:', e);
      }
    });
  }
}

export const syncService = new SyncService();
