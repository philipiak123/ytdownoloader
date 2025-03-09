const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os'); // Dodajemy, aby użyć tymczasowych folderów systemowych
const app = express();

// Ścieżki do plików ffmpeg.exe i yt-dlp.exe
const ffmpegPath = path.join(__dirname, 'ffmpeg.exe');
const ytDlpPath = path.join(__dirname, 'yt-dlp.exe');

// Upewnij się, że folder videos istnieje
const videosFolder = path.join(__dirname, 'videos');
if (!fs.existsSync(videosFolder)) {
  fs.mkdirSync(videosFolder);
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// Strona główna
app.get('/', (req, res) => {
  res.render('index');
});

// Funkcja do pobierania, przycinania i konwertowania pliku
const downloadAndConvert = (url, startTime, endTime, fileType) => {
  return new Promise((resolve, reject) => {
    // Pobierz tytuł filmu do nazwy pliku
    exec(`"${ytDlpPath}" --get-title "${url}"`, (error, stdout, stderr) => {
      if (error) {
        reject(`Błąd pobierania tytułu filmu: ${stderr}`);
        return;
      }

      const title = stdout.trim().replace(/[^a-zA-Z0-9-_]/g, '_'); // Bezpieczna nazwa pliku
      const tempFilePath = path.join(os.tmpdir(), `${title}.mp4`); // Tymczasowy plik wideo
      const outputFilePath = path.join(videosFolder, `${title}.${fileType}`);
      const timeArgs = (startTime && endTime) ? `-ss ${startTime} -to ${endTime}` : '';

      // Pobranie wideo do tymczasowego pliku
      const downloadCmd = `"${ytDlpPath}" -f bestvideo+bestaudio --merge-output-format mp4 -o "${tempFilePath}" "${url}"`;

      exec(downloadCmd, (error, stdout, stderr) => {
        if (error) {
          reject(`Błąd pobierania filmu: ${stderr}`);
          return;
        }

        if (fileType === 'mp3') {
          // Przycinanie audio i konwertowanie do MP3
          const audioCmd = `"${ffmpegPath}" ${timeArgs} -i "${tempFilePath}" -vn -acodec libmp3lame -ar 44100 -ac 2 -ab 192k "${outputFilePath}"`;

          exec(audioCmd, (audioError, audioStdout, audioStderr) => {
            if (audioError) {
              reject(`Błąd konwertowania audio do MP3: ${audioStderr}`);
              return;
            }

            // Usuwamy tymczasowy plik
            fs.unlink(tempFilePath, (err) => {
              if (err) {
                console.error('Błąd usuwania pliku tymczasowego:', err);
              }
            });

            // Ustaw timer do usunięcia pliku po 15 minutach
            setTimeout(() => {
              fs.unlink(outputFilePath, (err) => {
                if (err) {
                  console.error('Błąd usuwania pliku po 15 minutach:', err);
                } else {
                  console.log('Plik usunięty po 15 minutach');
                }
              });
            }, 15 * 60 * 1000); // 15 minut = 900000 ms

            const filePathFromVideos = outputFilePath.replace(videosFolder + path.sep, 'videos/');
            resolve(filePathFromVideos);
          });
        } else if (fileType === 'mp4') {
          // Przycinanie wideo i konwertowanie do MP4
          const videoCmd = `"${ffmpegPath}" ${timeArgs} -i "${tempFilePath}" -c:v libx264 -c:a aac -strict experimental "${outputFilePath}"`;

          exec(videoCmd, (videoError, videoStdout, videoStderr) => {
            if (videoError) {
              reject(`Błąd konwertowania wideo do MP4: ${videoStderr}`);
              return;
            }

            // Usuwamy tymczasowy plik
            fs.unlink(tempFilePath, (err) => {
              if (err) {
                console.error('Błąd usuwania pliku tymczasowego:', err);
              }
            });

            // Ustaw timer do usunięcia pliku po 15 minutach
            setTimeout(() => {
              fs.unlink(outputFilePath, (err) => {
                if (err) {
                  console.error('Błąd usuwania pliku po 15 minutach:', err);
                } else {
                  console.log('Plik usunięty po 15 minutach');
                }
              });
            }, 15 * 60 * 1000); // 15 minut = 900000 ms

            const filePathFromVideos = outputFilePath.replace(videosFolder + path.sep, 'videos/');
            resolve(filePathFromVideos);
          });
        }
      });
    });
  });
};

// Trasa do obsługi pobierania pliku
app.post('/download', async (req, res) => {
  const { url, startTime, endTime, fileType } = req.body;

  try {
    const filePath = await downloadAndConvert(url, startTime, endTime, fileType);
    res.render('download', { filePath: filePath.replace(__dirname, '') }); // Prześlij ścieżkę do renderowania
  } catch (error) {
    res.status(500).send(error);
  }
});

// Trasa do usuwania pliku po pobraniu
app.get('/delete/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'videos', filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Błąd usuwania pliku:', err);
      return res.status(500).send('Błąd usuwania pliku');
    }
    res.send('Plik usunięty');
  });
});

// Trasa do pobierania pliku
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'videos', filename);

  // Ustawienie nagłówków do pobrania pliku
  res.download(filePath, (err) => {
    if (err) {
      console.error('Błąd pobierania pliku:', err);
      return res.status(500).send('Błąd pobierania pliku');
    }
  });
});

// Ustawienie widoków (w tym przypadku EJS)
app.set('view engine', 'ejs');

// Uruchomienie serwera
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
