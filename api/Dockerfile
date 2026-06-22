# Menggunakan image Node.js yang ringan
FROM node:18-alpine

# Menentukan direktori kerja di dalam container
WORKDIR /usr/src/app

# Menyalin file package.json dan menginstal dependensi
COPY package*.json ./
RUN npm install

# Menyalin seluruh kode sumber backend
COPY . .

# Membuka port 5000 untuk backend
EXPOSE 5000

# Perintah untuk menjalankan server
CMD ["node", "server.js"]