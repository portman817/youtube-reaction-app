let bookmarks = {};
let ytPlayer = null;
let ytPlayerReady = false;

const labelMap = {
  Digit1: '1', Digit2: '2', Digit3: '3',
  Digit4: '4', Digit5: '5', Digit6: '6',
  Digit7: '7', Digit8: '8', Digit9: '9'
};

function onYouTubeIframeAPIReady() {
  console.log('📡 YouTube API geladen');
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('video-url');
  const linksContainer = document.getElementById('links');
  const scriptContainer = document.getElementById('script');
  const playerContainer = document.getElementById('player');

  // Заметки (textarea)
  let noteArea = scriptContainer.querySelector('textarea');
  if (!noteArea) {
    noteArea = document.createElement('textarea');
    noteArea.placeholder = 'Notizen hier schreiben...';
    noteArea.style.width = '100%';
    noteArea.style.height = '180px';
    noteArea.style.boxSizing = 'border-box';
    noteArea.style.backgroundColor = '#2e2e2e';
    noteArea.style.color = 'white';
    noteArea.style.border = 'none';
    noteArea.style.resize = 'none';
    noteArea.style.fontSize = '14px';
    noteArea.style.paddingTop = '0px';
    noteArea.style.verticalAlign = 'top'; 
    noteArea.style.textAlign = 'left';
    noteArea.style.overflowY = 'auto';
    noteArea.style.lineHeight = '1.4';
    noteArea.style.padding = '8px'; 

    scriptContainer.appendChild(noteArea);
  }

  window.electronAPI.loadNotes().then(content => {
    noteArea.value = content || '';
  });

  noteArea.addEventListener('input', () => {
    window.electronAPI.saveNotes(noteArea.value);
  });

  // Bookmarks aus der DB laden
  window.electronAPI.loadBookmarks().then((entries) => {
    entries.forEach(entry => {
      bookmarks[entry.key] = { time: entry.time, url: entry.url, title: entry.title };
      updateBookmarkUI(entry.key, { time: entry.time, url: entry.url, title: entry.title });
    });
    console.log('Bookmarks geladen');
  });

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
            console.log('✅ ytPlayer bereit');
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              setTimeout(() => document.body.focus(), 100);
            }
          }
        }
      });

      setTimeout(() => document.body.focus(), 100);
    }
  });

  document.addEventListener('keydown', (event) => {
    const active = document.activeElement;
    const tag = active.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable) return;
    if (active !== document.body) document.body.focus();

    const code = event.code;
    const allowedCodes = Object.keys(labelMap);

    if (code === 'Space') {
      event.preventDefault();
      const state = ytPlayer?.getPlayerState?.();
      if (state === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
      else ytPlayer.playVideo();
      return;
    }

    if (!allowedCodes.includes(code)) return;

    if (event.shiftKey) {
      if (ytPlayerReady && ytPlayer?.getCurrentTime) {
        const time = ytPlayer.getCurrentTime();
        const videoId = ytPlayer.getVideoData().video_id;
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const title = ytPlayer.getVideoData().title || 'Unbekanntes Video';

        bookmarks[code] = { time, url, title };
        updateBookmarkUI(code, { time, url, title });
        window.electronAPI.saveBookmark(code, url, title, time);
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
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                setTimeout(() => document.body.focus(), 100);
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
      } else {
        ytPlayer.seekTo(bookmark.time, true);
      }
    }
  });

  function updateBookmarkUI(key, data) {
    const formatted = formatTime(data.time);
    const existing = document.getElementById(`bookmark-${key}`);
    if (existing) existing.remove();

    const p = document.createElement('p');
    p.id = `bookmark-${key}`;
    p.style.margin = '4px 0';
    p.style.display = 'flex';
    p.style.alignItems = 'center';

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '❌';
    deleteBtn.style.marginRight = '8px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.background = 'transparent';
    deleteBtn.style.color = 'red';
    deleteBtn.style.border = 'none';
    deleteBtn.style.fontSize = '14px';

    deleteBtn.addEventListener('click', () => {
      delete bookmarks[key];
      p.remove();
      window.electronAPI.deleteBookmark(key);
      console.log(`Bookmark [${key}] gelöscht`);
      document.body.focus();

      const remainingKeys = Object.keys(bookmarks).sort();
      if (remainingKeys.length > 0) {
        const nextKey = remainingKeys[0];
        const nextBookmark = bookmarks[nextKey];
        const targetId = extractYouTubeId(nextBookmark.url);
        if (ytPlayer && ytPlayer.cueVideoById) {
          ytPlayer.cueVideoById(targetId, nextBookmark.time);
        }
      } else {
        playerContainer.innerHTML = '';
        ytPlayer = null;
        ytPlayerReady = false;
      }
    });

    const text = document.createElement('span');
    text.textContent = `[${labelMap[key] || key}] ${formatted} — ${data.title || 'Unbekannt'}`;
    text.addEventListener('click', () => {
      const currentId = extractYouTubeId(ytPlayer.getVideoUrl());
      const targetId = extractYouTubeId(data.url);
      if (targetId !== currentId) {
        ytPlayer.loadVideoById(targetId, data.time);
      } else {
        ytPlayer.seekTo(data.time, true);
      }
    });

    p.appendChild(deleteBtn);
    p.appendChild(text);
    linksContainer.appendChild(p);
  }
});

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
