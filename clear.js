const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3001;

// Ustawienia folderu do przechowywania plików
const videosDir = path.join(__dirname, 'videos');

// Upewnij się, że folder 'videos' istnieje
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir);
}

// Konfiguracja EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'videos')));

// Strona główna
app.get('/', (req, res) => {
  res.render('index');
});

// Endpoint do pobierania i przycinania filmu
app.post('/download', (req, res) => {
  const { url, startTime, endTime } = req.body;
  const duration = parseInt(endTime) - parseInt(startTime);  // obliczanie czasu trwania w sekundach
  const outputFilename = path.join(videosDir, `${Date.now()}.mp4`);

  const ytDlpPath = path.join(__dirname, 'yt-dlp.exe');
  const ffmpegPath = path.join(__dirname, 'ffmpeg.exe');

  // Pobieranie pliku
  const downloadCommand = `"${ytDlpPath}" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]" --merge-output-format mp4 -o "temp.mp4" "${url}"`;
  exec(downloadCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Błąd pobierania: ${error.message}`);
      return res.status(500).send('Błąd pobierania filmu.');
    }

    // Przycinanie wideo
    const trimCommand = `"${ffmpegPath}" -ss ${startTime} -i "temp.mp4" -t ${duration} -c:v libx264 -c:a aac -strict experimental -preset fast "${outputFilename}"`;
    exec(trimCommand, (trimError, trimStdout, trimStderr) => {
      if (trimError) {
        console.error(`❌ Błąd przycinania: ${trimError.message}`);
        return res.status(500).send('Błąd przycinania filmu.');
      }

      // Usuwamy tymczasowy plik
      fs.unlinkSync('temp.mp4');

      // Przesyłamy stronę z przyciskiem do pobrania
      res.render('download', { filePath: outputFilename });
    });
  });
});

// Endpoint do usuwania pliku po pobraniu
app.get('/delete/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(videosDir, filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`❌ Błąd usuwania pliku: ${err.message}`);
      return res.status(500).send('Błąd usuwania pliku.');
    }
    console.log(`✅ Plik ${filename} został usunięty.`);
    res.send('Plik usunięty.');
  });
});

// Start serwera
app.listen(port, () => {
  console.log(`Serwer uruchomiony na http://localhost:${port}`);
});
