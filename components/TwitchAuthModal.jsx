import React, { useState } from 'react';
import { LogIn, Key, Copy, Check, ExternalLink, AlertCircle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { TwitchEventSubClient } from '../services/twitchEventSub';
import { sound } from '../services/sound';

export const TwitchAuthModal = ({
  isOpen,
  onClose,
  clientId,
  setClientId,
  onLoginOAuth,
  onTokenSuccess,
}) => {
  const [activeTab, setActiveTab] = useState('token'); // 'token' | 'oauth'
  const [tokenInput, setTokenInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  if (!isOpen) return null;

  const currentRedirectUri = `${window.location.origin}${window.location.pathname}`;

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(currentRedirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  const handleTokenSubmit = async (e) => {
    e?.preventDefault();
    if (!tokenInput.trim()) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const userProfile = await TwitchEventSubClient.authenticateWithToken(tokenInput.trim());
      sound.playWin();
      onTokenSuccess(userProfile);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Не удалось проверить токен Twitch. Проверьте правильность токена.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-[#141418] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Авторизация Twitch</h3>
              <p className="text-xs text-zinc-400">Подключение аккаунта стримера</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-2 p-2 bg-zinc-900 border-b border-zinc-800 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('token');
              setErrorMessage('');
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'token'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>⚡ Вход по токену (Без ошибок)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('oauth');
              setErrorMessage('');
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'oauth'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Через Twitch Console</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 flex flex-col gap-4">
          {errorMessage && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/50 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'token' ? (
            <form onSubmit={handleTokenSubmit} className="flex flex-col gap-4">
              <div className="p-3.5 bg-purple-950/20 border border-purple-800/40 rounded-xl text-xs text-purple-200/90 flex flex-col gap-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Самый надежный способ (100% без ошибки redirect_mismatch):
                </span>
                <ol className="list-decimal list-inside space-y-1 text-zinc-300 pl-1">
                  <li>
                    Нажмите кнопку ниже, чтобы открыть генератор токенов Twitch в новой вкладке.
                  </li>
                  <li>
                    Нажмите кнопку «Authorize» на Twitch и скопируйте полученный <strong>Access Token</strong>.
                  </li>
                  <li>Вставьте скопированный токен в поле ниже и нажмите «Подключить».</li>
                </ol>
              </div>

              {/* Direct generator link */}
              <a
                href="https://twitchtokengenerator.com/quick/6e885d8520"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow transition-colors active:scale-98"
              >
                <span>🔑 Получить токен Twitch (в новой вкладке)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-300 font-medium">
                  Вставьте Access Token:
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="oauth:... или ey..."
                  className="w-full px-3.5 py-2.5 text-xs font-mono text-white bg-zinc-900 border border-zinc-700 rounded-xl focus:outline-none focus:border-purple-500 placeholder-zinc-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !tokenInput.trim()}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl shadow transition-all"
                >
                  {isLoading ? 'Проверка...' : 'Подключить Twitch'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-zinc-300 flex flex-col gap-2">
                <span className="font-bold text-white">Почему возникала ошибка redirect_mismatch?</span>
                <p className="text-zinc-400 leading-relaxed">
                  Twitch требует, чтобы адрес страницы в браузере был в точности добавлен в поле{' '}
                  <strong className="text-white">OAuth Redirect URLs</strong> вашего приложения на{' '}
                  <a
                    href="https://dev.twitch.tv/console/apps"
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 underline"
                  >
                    dev.twitch.tv
                  </a>
                  .
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-300 font-medium">
                  Ваш точный Redirect URI (скопируйте в Twitch Console):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentRedirectUri}
                    className="flex-1 px-3 py-2 text-xs font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg select-all"
                  />
                  <button
                    type="button"
                    onClick={copyRedirectUri}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
                  >
                    {copiedRedirect ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRedirect ? 'Скопировано' : 'Копировать'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-300 font-medium">Ваш Twitch Client ID:</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value.trim())}
                  placeholder="Вставьте Client ID из dev.twitch.tv"
                  className="w-full px-3 py-2 text-xs font-mono text-white bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLoginOAuth();
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow transition-colors"
                >
                  Войти через Twitch (OAuth)
                </button>
              </div>
            </div>
          )}

          {/* Bottom helpful note */}
          <div className="pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 leading-relaxed">
            💡 <strong>Важно для стрима:</strong> Чтобы крутить колесо, делать прокачки, принимать ставки лотов и слушать озвучку <strong className="text-white">!tts</strong> — входить через аккаунт <strong>не обязательно</strong>. Достаточно просто написать ник стрима в поле <span className="font-mono text-zinc-300">twitch.tv/ник</span>!
          </div>
        </div>
      </div>
    </div>
  );
};
