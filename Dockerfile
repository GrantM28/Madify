FROM node:20-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

ENV PORT=3000
ENV MUSIC_ROOT=/music
ENV FFMPEG_PATH=/usr/bin/ffmpeg

EXPOSE 3000

CMD ["npm", "start"]
