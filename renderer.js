let bookmarks = {};
let ytPlayer = null;
let ytPlayerReady = false;
const labelMap = {
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9'
};

function onYouTubeIframeAPIReady() {
  // Diese Methode wird von der YouTube API aufgerufen und muss global verfügbar sein
  console.log('📡 YouTube API geladen');
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('video-url');
  const linksContainer = document.getElementById('links');
  const playerContainer = document.getElementById('player');

  // Lese gespeicherte Bookmarks aus der Datenbank
  window.electronAPI.loadBookmarks().then((entries) => {
    entries.forEach(entry => {
      bookmarks[entry.key] = { time: entry.time, url: entry.url };
      updateBookmarkUI(entry.key, { time: entry.time, url: entry.url });
    });
    console.log('Bookmarks aus Datenbank geladen');
  });

  // YouTube IFrame API laden
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.body.appendChild(tag);

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const value = input.value.trim();
      if (value.toLowerCase() === 'clear') {
        bookmarks = {};
        linksContainer.innerHTML = '';
        window.electronAPI.clearBookmarks();
        console.log('🧹 Alle Bookmarks gelöscht');
        alert('Alle Bookmarks wurden gelöscht.');
        input.value = '';
        return;
      }

      const url = input.value;
      const videoId = extractYouTubeId(url);
      if (!videoId) {
        alert('Ungültige YouTube-URL.');
        return;
      }

      console.log(`🎥 Video wird geladen: ID = ${videoId}`);

      const div = document.createElement('div');
      div.id = 'ytplayer';
      div.tabIndex = -1;
      playerContainer.innerHTML = '';
      playerContainer.appendChild(div);

      ytPlayer = new YT.Player('ytplayer', {
        height: '540',
        width: '960',
        videoId: videoId,
        events: {
          onReady: () => {
            ytPlayerReady = true;
            console.log('ytPlayer ist bereit');
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              setTimeout(() => {
                document.body.focus();
                console.log('🎬 Wiedergabe gestartet → Fokus zurück auf body');
              }, 100);
            }
          }
        }
      });

      setTimeout(() => {
        document.body.focus();
        console.log('Fokus auf body nach Enter gesetzt');
      }, 100);
    }
  });

  // Tastenkürzel-Logik
  document.addEventListener('keydown', (event) => {
    const active = document.activeElement;
    const tag = active.tagName;

    if (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable) return;
    if (active !== document.body) document.body.focus();

    const code = event.code;
    const allowedCodes = Object.keys(labelMap);

    if (code === 'Space') {
      event.preventDefault();
      if (!ytPlayer || !ytPlayer.getPlayerState) return;

      const state = ytPlayer.getPlayerState();
      switch (state) {
        case YT.PlayerState.PLAYING:
          ytPlayer.pauseVideo();
          console.log('⏸ Pause');
          break;
        case YT.PlayerState.PAUSED:
        case YT.PlayerState.ENDED:
        case YT.PlayerState.CUED:
        case YT.PlayerState.UNSTARTED:
          ytPlayer.playVideo();
          console.log('▶Wiedergabe');
          break;
        default:
          console.log('ℹVideo ist nicht bereit oder unbekannter Status');
      }
      return;
    }

    if (!allowedCodes.includes(code)) return;

    if (event.shiftKey) {
      if (ytPlayerReady && ytPlayer && ytPlayer.getCurrentTime) {
        const time = ytPlayer.getCurrentTime();
        const videoId = ytPlayer.getVideoData().video_id;
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        bookmarks[code] = { time, url };
        updateBookmarkUI(code, { time, url });
        window.electronAPI.saveBookmark(code, url, time);
        console.log(`Bookmark [${code}] gespeichert: ${formatTime(time)}`);
      }
    } else {
      const bookmark = bookmarks[code];
      if (!bookmark) return;

      const targetId = extractYouTubeId(bookmark.url);

      if (!ytPlayer) {
        const div = document.createElement('div');
        div.id = 'ytplayer';
        div.tabIndex = -1;
        playerContainer.innerHTML = '';
        playerContainer.appendChild(div);

        ytPlayer = new YT.Player('ytplayer', {
          height: '540',
          width: '960',
          videoId: targetId,
          playerVars: { start: Math.floor(bookmark.time) },
          events: {
            onReady: () => {
              ytPlayerReady = true;
              ytPlayer.pauseVideo();
              console.log(`Neuer Player: Video ${targetId} geladen bei ${formatTime(bookmark.time)}`);
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                setTimeout(() => {
                  document.body.focus();
                  console.log('🎬 Wiedergabe gestartet → Fokus zurück auf body');
                }, 100);
              }
            }
          }
        });
        return;
      }

      const currentId = extractYouTubeId(ytPlayer.getVideoUrl());
      ytPlayer.pauseVideo();

      if (targetId !== currentId) {
        ytPlayer.cueVideoById(targetId, bookmark.time);
        console.log(`Pause + Lade neues Video ${targetId} bei ${formatTime(bookmark.time)}`);
      } else {
        ytPlayer.seekTo(bookmark.time, true);
        console.log(`Springe zu ${formatTime(bookmark.time)}`);
      }
    }
  });

  function updateBookmarkUI(key, data) {
    const time = data.time;
    const url = data.url;
    const formatted = formatTime(time);

    const existing = document.getElementById(`bookmark-${key}`);
    if (existing) existing.remove();

    const p = document.createElement('p');
    p.id = `bookmark-${key}`;
    p.textContent = `[${labelMap[key] || key}] ${formatted} — ${url}`;
    p.style.margin = '4px 0';

    p.addEventListener('click', () => {
      const currentId = extractYouTubeId(ytPlayer.getVideoUrl());
      const targetId = extractYouTubeId(url);

      if (ytPlayer && ytPlayer.seekTo) {
        if (targetId !== currentId) {
          ytPlayer.loadVideoById(targetId, time);
          console.log(`Lade Video ${targetId} bei ${formatted}`);
        } else {
          ytPlayer.seekTo(time, true);
          console.log(`Klick auf Bookmark [${key}] → ${formatted}`);
        }
      }
    });

    linksContainer.appendChild(p);
  }
});

// Hilfsfunktionen
function extractYouTubeId(url) {
  const regExp = /(?:v=|\/|vi=|be\/)([0-9A-Za-z_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}
