// Twitch EventSub WebSocket & Helix API for Channel Points (Награды за баллы)

export class TwitchEventSubClient {
  constructor({ onRedemption, onStatusChange, onError }) {
    this.ws = null;
    this.sessionId = null;
    this.clientId = '';
    this.token = '';
    this.broadcasterId = '';
    this.broadcasterName = '';
    this.rewardFilterId = 'ALL'; // or specific reward ID
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'error'
    this.onRedemption = onRedemption || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.onError = onError || (() => {});
  }

  // Get OAuth URL for streamer login (Implicit Grant)
  static getAuthUrl(clientId, redirectUri = window.location.origin + window.location.pathname) {
    const scopes = encodeURIComponent(
      'channel:read:redemptions channel:manage:redemptions chat:read'
    );
    return `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${scopes}&force_verify=true`;
  }

  // Parse token from window.location.hash
  static parseTokenFromHash() {
    if (!window.location.hash) return null;
    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = params.get('access_token');
    return token;
  }

  // Validate token via https://id.twitch.tv/oauth2/validate and retrieve client_id, login, user_id
  static async validateToken(token) {
    if (!token) throw new Error('Токен не указан');
    const cleanToken = token.replace(/^(oauth:|bearer\s+)/i, '').trim();
    const res = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        Authorization: `OAuth ${cleanToken}`,
      },
    });
    if (!res.ok) {
      throw new Error('Токен недействителен или истек срок его действия');
    }
    const data = await res.json();
    return {
      token: cleanToken,
      clientId: data.client_id,
      login: data.login,
      userId: data.user_id,
      scopes: data.scopes || [],
    };
  }

  // Full authentication via token (fetches user profile: name, avatar, id, clientId)
  static async authenticateWithToken(token) {
    const validated = await TwitchEventSubClient.validateToken(token);
    const helper = new TwitchEventSubClient({});
    try {
      const user = await helper.fetchBroadcasterInfo(validated.token, validated.clientId);
      return {
        id: user.id,
        login: user.login,
        displayName: user.display_name,
        avatar: user.profile_image_url,
        clientId: validated.clientId,
        token: validated.token,
      };
    } catch {
      return {
        id: validated.userId,
        login: validated.login,
        displayName: validated.login,
        avatar: '',
        clientId: validated.clientId,
        token: validated.token,
      };
    }
  }

  // Fetch broadcaster user info (returns id, login, display_name, profile_image_url)
  async fetchBroadcasterInfo(token, clientId) {
    const res = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-Id': clientId,
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch user info: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data[0];
  }

  // Fetch custom channel rewards (to let streamer pick which reward to track)
  async fetchRewards(broadcasterId, token, clientId) {
    const res = await fetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcasterId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Client-Id': clientId,
        },
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch rewards: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data || [];
  }

  // Pause or unpause reward on Twitch automatically when streamer toggles integration
  async setRewardPaused(broadcasterId, rewardId, isPaused, token, clientId) {
    if (!rewardId || rewardId === 'ALL') return;
    try {
      const res = await fetch(
        `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcasterId}&id=${rewardId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Client-Id': clientId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_paused: isPaused,
          }),
        }
      );
      return res.ok;
    } catch (e) {
      console.warn('Failed to update reward pause status on Twitch:', e);
      return false;
    }
  }

  // Connect to EventSub WebSocket
  async connect({ clientId, token, rewardFilterId = 'ALL' }) {
    this.disconnect();
    this.clientId = clientId;
    this.token = token;
    this.rewardFilterId = rewardFilterId;
    this.updateStatus('connecting');

    try {
      // 1. Fetch broadcaster info
      const user = await this.fetchBroadcasterInfo(token, clientId);
      this.broadcasterId = user.id;
      this.broadcasterName = user.display_name || user.login;

      // 2. Open WebSocket
      this.ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          const msgType = msg.metadata?.message_type;

          if (msgType === 'session_welcome') {
            this.sessionId = msg.payload.session.id;
            await this.subscribeToRedemptions();
            this.updateStatus('connected');
          } else if (msgType === 'notification') {
            this.handleNotification(msg.payload);
          } else if (msgType === 'session_keepalive') {
            // Keepalive ping received
          }
        } catch (e) {
          console.error('EventSub message parse error:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('EventSub WS error:', err);
        this.updateStatus('error');
        this.onError('Ошибка соединения с Twitch EventSub');
      };

      this.ws.onclose = () => {
        this.updateStatus('disconnected');
      };

      return user;
    } catch (err) {
      console.error('EventSub connection failed:', err);
      this.updateStatus('error');
      this.onError(err.message || 'Не удалось подключиться к Twitch API');
      throw err;
    }
  }

  // Subscribe to channel points redemption events
  async subscribeToRedemptions() {
    if (!this.sessionId || !this.broadcasterId) return;

    const res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Client-Id': this.clientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'channel.channel_points_custom_reward_redemption.add',
        version: '1',
        condition: {
          broadcaster_user_id: this.broadcasterId,
        },
        transport: {
          method: 'websocket',
          session_id: this.sessionId,
        },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('Subscription response warning:', errData);
    }
  }

  handleNotification(payload) {
    const event = payload?.event;
    if (!event) return;

    const reward = event.reward;
    // Check if matches reward filter
    if (this.rewardFilterId !== 'ALL' && reward?.id !== this.rewardFilterId) {
      return;
    }

    this.onRedemption({
      userName: event.user_name || event.user_login,
      userLogin: event.user_login,
      rewardTitle: reward?.title,
      rewardCost: reward?.cost,
      userInput: event.user_input,
      timestamp: Date.now(),
    });
  }

  setRewardFilter(filterId) {
    this.rewardFilterId = filterId;
  }

  updateStatus(status) {
    this.status = status;
    this.onStatusChange(status, this.broadcasterName);
  }

  disconnect() {
    if (this.ws) {
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
    this.sessionId = null;
    this.updateStatus('disconnected');
  }
}
