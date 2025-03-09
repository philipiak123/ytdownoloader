# Wybór obrazu bazowego
FROM node:16

# Ustawienie katalogu roboczego w kontenerze
WORKDIR /usr/src/app

# Kopiowanie plików package.json i package-lock.json
COPY package*.json ./

# Instalowanie zależności
RUN npm install

# Kopiowanie reszty plików projektu
COPY . .

# Ustawienie portu, na którym nasz serwer będzie działać
EXPOSE 3001

# Uruchomienie serwera
CMD ["node", "server.js"]
