// Twitch IRC WebSocket client for reading chat messages without API tokens
export class TwitchIrcClient {
  constructor({ onMessage, onStatusChange }) {
    this.ws = null;
    this.channel = '';
    this.onMessage = onMessage || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'error'
    this.pingInterval = null;
  }

  connect(channelName) {
    if (!channelName) return;
    const cleanChannel = channelName.trim().toLowerCase().replace(/^#/, '');
    if (!cleanChannel) return;

    this.disconnect();
    this.channel = cleanChannel;
    this.updateStatus('connecting');

    try {
      this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

      this.ws.onopen = () => {
        // Request tags for display-names and metadata
        this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        // Anonymous login (standard Twitch anonymous access)
        const anonNick = `justinfan${Math.floor(10000 + Math.random() * 90000)}`;
        this.ws.send(`PASS SCHMOOPIE`);
        this.ws.send(`NICK ${anonNick}`);
        this.ws.send(`JOIN #${this.channel}`);

        this.updateStatus('connected');

        // Heartbeat keep-alive
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send('PING :tmi.twitch.tv');
          }
        }, 120000);
      };

      this.ws.onmessage = (event) => {
        const raw = event.data;
        this.handleRawMessage(raw);
      };

      this.ws.onerror = (err) => {
        console.error('Twitch IRC error:', err);
        this.updateStatus('error');
      };

      this.ws.onclose = () => {
        this.updateStatus('disconnected');
        this.cleanupPing();
      };
    } catch (e) {
      console.error('Twitch IRC connection failed:', e);
      this.updateStatus('error');
    }
  }

  handleRawMessage(raw) {
    const lines = raw.split('\r\n');
    for (const line of lines) {
      if (!line) continue;

      // Handle Twitch PING
      if (line.startsWith('PING')) {
        this.ws.send(line.replace('PING', 'PONG'));
        continue;
      }

      // Parse PRIVMSG
      if (line.includes('PRIVMSG')) {
        this.parsePrivmsg(line);
      }
    }
  }

  parsePrivmsg(rawLine) {
    try {
      let tags = {};
      let line = rawLine;

      if (line.startsWith('@')) {
        const spaceIdx = line.indexOf(' ');
        const rawTags = line.substring(1, spaceIdx);
        line = line.substring(spaceIdx + 1);

        rawTags.split(';').forEach((item) => {
          const [k, v] = item.split('=');
          tags[k] = v;
        });
      }

      // Format: :user!user@user.tmi.twitch.tv PRIVMSG #channel :message
      const match = line.match(/^:([^!]+)![^ ]+ PRIVMSG #[^ ]+ :(.*)$/);
      if (match) {
        const rawUser = match[1];
        const message = match[2];
        const displayName = tags['display-name'] || rawUser;

        this.onMessage({
          username: rawUser,
          displayName,
          message: message.trim(),
          tags,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.warn('Failed to parse IRC line:', e);
    }
  }

  updateStatus(newStatus) {
    this.status = newStatus;
    this.onStatusChange(newStatus, this.channel);
  }

  cleanupPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    this.cleanupPing();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch {}
      this.ws = null;
    }
    this.updateStatus('disconnected');
  }
}
